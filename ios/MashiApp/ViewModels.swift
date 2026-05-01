import Foundation

@MainActor
final class SessionViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var user: User?
    @Published var isLoading = true
    @Published var errorMessage: String?

    init() {
        Task { await restoreSession() }
    }

    func restoreSession() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        guard APIClient.shared.authToken != nil else { return }
        do {
            user = try await APIClient.shared.fetchCurrentUser()
            isAuthenticated = true
        } catch {
            APIClient.shared.clearAuthToken()
            user = nil
            isAuthenticated = false
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            user = try await APIClient.shared.login(email: email, password: password)
            isAuthenticated = true
        } catch let apiError as APIError {
            errorMessage = apiError.localizedDescription
            isAuthenticated = false
            user = nil
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
            user = nil
        }
    }

    func register(firstName: String, lastName: String, email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            user = try await APIClient.shared.register(firstName: firstName, lastName: lastName, email: email, password: password)
            isAuthenticated = true
        } catch let apiError as APIError {
            errorMessage = apiError.localizedDescription
            isAuthenticated = false
            user = nil
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
            user = nil
        }
    }

    func logout() {
        APIClient.shared.clearAuthToken()
        user = nil
        isAuthenticated = false
        errorMessage = nil
    }
}

@MainActor
final class GroupsViewModel: ObservableObject {
    @Published var groups: [MashiGroup] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var exploreGroups: [GroupDirectoryItem] = []
    @Published var exploreLoading = false
    @Published var exploreError: String?
    @Published var actionError: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            groups = try await APIClient.shared.fetchGroups()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadDiscover() async {
        exploreLoading = true
        exploreError = nil
        defer { exploreLoading = false }

        do {
            let res = try await APIClient.shared.fetchGroupDiscover()
            exploreGroups = res.publicGroups
        } catch {
            exploreError = error.localizedDescription
        }
    }

    func joinExploreGroup(_ item: GroupDirectoryItem) async {
        actionError = nil
        do {
            if item.visibility == "private" {
                try await APIClient.shared.requestJoinPrivateGroup(groupID: item.id)
            } else {
                _ = try await APIClient.shared.joinPublicGroup(groupID: item.id)
            }
            await load()
            await loadDiscover()
        } catch {
            actionError = error.localizedDescription
        }
    }
}

@MainActor
final class MarketsViewModel: ObservableObject {
    @Published var markets: [Market] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            markets = try await APIClient.shared.fetchMarkets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var dashboard: DashboardSummary?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            dashboard = try await APIClient.shared.fetchDashboard()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [MobileNotification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            notifications = try await APIClient.shared.fetchNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func markRead(_ id: String) async {
        do {
            try await APIClient.shared.markNotificationRead(notificationID: id)
            notifications = notifications.map { item in
                if item.id == id {
                    return MobileNotification(
                        id: item.id,
                        type: item.type,
                        actorUserID: item.actorUserID,
                        actorName: item.actorName,
                        groupID: item.groupID,
                        marketID: item.marketID,
                        message: item.message,
                        readAt: Date(),
                        createdAt: item.createdAt
                    )
                }
                return item
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func markAllRead() async {
        do {
            try await APIClient.shared.markAllNotificationsRead()
            notifications = notifications.map { item in
                MobileNotification(
                    id: item.id,
                    type: item.type,
                    actorUserID: item.actorUserID,
                    actorName: item.actorName,
                    groupID: item.groupID,
                    marketID: item.marketID,
                    message: item.message,
                    readAt: Date(),
                    createdAt: item.createdAt
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
