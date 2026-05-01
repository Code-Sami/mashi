import Foundation

private struct EmptyBody: Encodable {}

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case server(statusCode: Int)
    case unauthorized
    case timeout

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL."
        case .invalidResponse:
            return "Invalid server response."
        case .server(let statusCode):
            return "Server error (\(statusCode))."
        case .unauthorized:
            return "Please log in again."
        case .timeout:
            return "Request timed out. Check that the local server is running."
        }
    }
}

final class APIClient {
    static let shared = APIClient()
    static let tokenStoreKey = "mashi.mobile.token"

    /// Production/TestFlight: set `API_BASE_URL` in the target build settings
    /// (`INFOPLIST_KEY_API_BASE_URL`) to your deployed origin, e.g. `https://mashimarkets.com` (no trailing slash).
    /// Debug builds without that key default to the local Next.js dev server.
    private let baseURL: String
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let session: URLSession

    private static func resolvedBaseURL() -> String {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed.hasSuffix("/") ? String(trimmed.dropLast()) : trimmed
            }
        }
        #if DEBUG
        return "http://127.0.0.1:3000"
        #else
        fatalError(
            "API_BASE_URL is not set. In Xcode: target → Build Settings → add User-Defined setting API_BASE_URL, " +
                "or set INFOPLIST_KEY_API_BASE_URL to your production origin (e.g. https://mashimarkets.com)."
        )
        #endif
    }

    private init() {
        self.baseURL = Self.resolvedBaseURL()
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            if let date = Self.iso8601WithFractionalSeconds.date(from: value) {
                return date
            }
            if let date = Self.iso8601Basic.date(from: value) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid ISO-8601 date: \(value)"
            )
        }
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: configuration)
    }

    private static let iso8601WithFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let iso8601Basic: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    var authToken: String? {
        get { UserDefaults.standard.string(forKey: Self.tokenStoreKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.tokenStoreKey) }
    }

    func clearAuthToken() {
        UserDefaults.standard.removeObject(forKey: Self.tokenStoreKey)
    }

    func login(email: String, password: String) async throws -> User {
        struct LoginBody: Encodable {
            let email: String
            let password: String
        }
        struct LoginResponse: Decodable {
            let token: String
            let user: User
        }

        let body = LoginBody(email: email, password: password)
        let response: LoginResponse = try await request(path: "/api/mobile/auth/login", method: "POST", body: body, requiresAuth: false)
        authToken = response.token
        return response.user
    }

    func register(firstName: String, lastName: String, email: String, password: String) async throws -> User {
        struct RegisterBody: Encodable {
            let firstName: String
            let lastName: String
            let email: String
            let password: String
        }
        struct RegisterResponse: Decodable {
            let token: String
            let user: User
        }

        let body = RegisterBody(firstName: firstName, lastName: lastName, email: email, password: password)
        let response: RegisterResponse = try await request(path: "/api/mobile/auth/register", method: "POST", body: body, requiresAuth: false)
        authToken = response.token
        return response.user
    }

    func fetchCurrentUser() async throws -> User {
        try await request(path: "/api/mobile/auth/me")
    }

    func fetchGroups() async throws -> [MashiGroup] {
        try await request(path: "/api/mobile/groups")
    }

    func fetchGroupDiscover() async throws -> GroupDiscoverResponse {
        try await request(path: "/api/mobile/groups/discover")
    }

    func createGroup(name: String, visibility: String) async throws -> MashiGroup {
        struct Body: Encodable {
            let name: String
            let visibility: String
        }
        struct Response: Decodable {
            let group: MashiGroup
        }
        let body = Body(name: name, visibility: visibility)
        let response: Response = try await request(path: "/api/mobile/groups", method: "POST", body: body)
        return response.group
    }

    func joinPublicGroup(groupID: String) async throws -> MashiGroup {
        struct Response: Decodable {
            let group: MashiGroup
        }
        let response: Response = try await request(
            path: "/api/mobile/groups/\(groupID)/join",
            method: "POST",
            body: Optional<EmptyBody>.none
        )
        return response.group
    }

    func requestJoinPrivateGroup(groupID: String) async throws {
        struct OkResponse: Decodable {
            let ok: Bool
        }
        let _: OkResponse = try await request(
            path: "/api/mobile/groups/\(groupID)/join-request",
            method: "POST",
            body: Optional<EmptyBody>.none
        )
    }

    func createMarket(groupID: String, question: String, deadline: Date) async throws -> Market {
        struct Body: Encodable {
            let question: String
            let deadline: String
        }
        struct Response: Decodable {
            let market: Market
        }
        let deadlineString = Self.iso8601Basic.string(from: deadline)
        let body = Body(question: question, deadline: deadlineString)
        let response: Response = try await request(
            path: "/api/mobile/groups/\(groupID)/markets",
            method: "POST",
            body: body
        )
        return response.market
    }

    func fetchMarkets() async throws -> [Market] {
        try await request(path: "/api/mobile/markets")
    }

    func fetchDashboard() async throws -> DashboardSummary {
        try await request(path: "/api/mobile/dashboard")
    }

    func fetchUserProfile(userID: String) async throws -> PublicUserProfile {
        try await request(path: "/api/mobile/users/\(userID)")
    }

    func placeBet(marketID: String, side: String, amount: Int) async throws -> Market {
        struct BetBody: Encodable {
            let side: String
            let amount: Int
        }
        struct BetResponse: Decodable {
            let market: Market
        }
        let body = BetBody(side: side, amount: amount)
        let response: BetResponse = try await request(
            path: "/api/mobile/markets/\(marketID)/bet",
            method: "POST",
            body: body
        )
        return response.market
    }

    func fetchMarketDetail(marketID: String) async throws -> MarketDetailResponse {
        try await request(path: "/api/mobile/markets/\(marketID)")
    }

    func resolveMarket(marketID: String, outcome: String) async throws {
        struct Body: Encodable { let outcome: String }
        struct OkResponse: Decodable { let ok: Bool }
        let _: OkResponse = try await request(
            path: "/api/mobile/markets/\(marketID)/resolve",
            method: "POST",
            body: Body(outcome: outcome)
        )
    }

    func disputeMarket(marketID: String) async throws {
        struct OkResponse: Decodable { let ok: Bool }
        let _: OkResponse = try await request(
            path: "/api/mobile/markets/\(marketID)/dispute",
            method: "POST",
            body: Optional<EmptyBody>.none
        )
    }

    func acceptMarketResolution(marketID: String) async throws {
        struct OkResponse: Decodable { let ok: Bool }
        let _: OkResponse = try await request(
            path: "/api/mobile/markets/\(marketID)/accept",
            method: "POST",
            body: Optional<EmptyBody>.none
        )
    }

    func fetchNotifications() async throws -> [MobileNotification] {
        let response: NotificationListResponse = try await request(path: "/api/mobile/notifications")
        return response.notifications
    }

    func markNotificationRead(notificationID: String) async throws {
        struct Body: Encodable {
            let action: String
            let notificationID: String
        }
        struct OkResponse: Decodable { let ok: Bool }
        let _: OkResponse = try await request(
            path: "/api/mobile/notifications",
            method: "POST",
            body: Body(action: "mark_read", notificationID: notificationID)
        )
    }

    func markAllNotificationsRead() async throws {
        struct Body: Encodable { let action: String }
        struct OkResponse: Decodable { let ok: Bool }
        let _: OkResponse = try await request(
            path: "/api/mobile/notifications",
            method: "POST",
            body: Body(action: "mark_all_read")
        )
    }

    func acceptInvite(code: String) async throws -> MashiGroup {
        struct Response: Decodable { let group: MashiGroup }
        let response: Response = try await request(
            path: "/api/mobile/invite/\(code)",
            method: "POST",
            body: Optional<EmptyBody>.none
        )
        return response.group
    }

    private func request<T: Decodable>(
        path: String,
        method: String = "GET",
        requiresAuth: Bool = true
    ) async throws -> T {
        return try await request(path: path, method: method, body: Optional<EmptyBody>.none, requiresAuth: requiresAuth)
    }

    private func request<T: Decodable, Body: Encodable>(
        path: String,
        method: String = "GET",
        body: Body? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = body {
            request.httpBody = try encoder.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let urlError as URLError where urlError.code == .timedOut {
            throw APIError.timeout
        } catch {
            throw error
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        if http.statusCode == 401 {
            throw APIError.unauthorized
        }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.server(statusCode: http.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }
}
