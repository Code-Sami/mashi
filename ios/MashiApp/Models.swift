import Foundation

struct User: Codable, Identifiable, Hashable {
    let id: String
    let displayName: String
    let username: String?
    let avatarURL: URL?
}

struct MashiGroup: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let visibility: String
    let memberCount: Int
}

/// Public directory row (explore / join flows).
struct GroupDirectoryItem: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let visibility: String
    let memberCount: Int
    let isMember: Bool
    let hasPendingRequest: Bool
}

struct GroupDiscoverResponse: Codable {
    let myGroups: [GroupDirectoryItem]
    let publicGroups: [GroupDirectoryItem]
}

struct Market: Codable, Identifiable, Hashable {
    let id: String
    let question: String
    let groupID: String
    let deadline: Date
    let status: String
    let yesPrice: Double
    let noPrice: Double
}

struct MarketDetailResponse: Codable, Hashable {
    let market: MarketDetail
    let history: [MarketHistoryPoint]
    let recentBets: [RecentBet]
}

struct MarketDetail: Codable, Identifiable, Hashable {
    let id: String
    let question: String
    let groupID: String
    let deadline: Date
    let status: String
    let outcome: String?
    let yesPrice: Double
    let noPrice: Double
    let totalVolume: Double
    let umpireID: String
    let canResolve: Bool
}

struct MarketHistoryPoint: Codable, Identifiable, Hashable {
    let id: String
    let yesPrice: Double
    let noPrice: Double
    let totalVolume: Double
    let createdAt: Date?
}

struct RecentBet: Codable, Identifiable, Hashable {
    let id: String
    let userID: String
    let userName: String
    let side: String
    let amount: Double
    let createdAt: Date?
}

struct NotificationListResponse: Codable, Hashable {
    let notifications: [MobileNotification]
}

struct MobileNotification: Codable, Identifiable, Hashable {
    let id: String
    let type: String
    let actorUserID: String?
    let actorName: String?
    let groupID: String?
    let marketID: String?
    let message: String?
    let readAt: Date?
    let createdAt: Date?
}

struct ActivityItem: Codable, Identifiable, Hashable {
    let id: String
    let type: String
    let actorUserID: String?
    let actorName: String
    let marketID: String?
    let marketQuestion: String?
    let summary: String
    let createdAt: Date
}

struct DashboardSummary: Codable {
    let stats: DashboardStats
    let expiringSoon: [Market]
    let newMarkets: [Market]
    let friendActivity: [ActivityItem]
    let recentResolvedBets: [ResolvedBet]
}

struct DashboardStats: Codable, Hashable {
    let totalBets: Int
    let activeMarkets: Int
    let grossWinnings: Double
    let netPnL: Double
}

struct ResolvedBet: Codable, Identifiable, Hashable {
    let id: String
    let marketID: String
    let marketQuestion: String
    let result: String
    let pnl: Double
    let createdAt: Date?
}

struct PublicUserProfile: Codable, Hashable {
    let user: PublicUserCore
    let stats: PublicUserStats
}

struct PublicUserCore: Codable, Hashable {
    let id: String
    let name: String
    let email: String
    let avatarURL: URL?
    let initials: String
}

struct PublicUserStats: Codable, Hashable {
    let betsPlaced: Int
    let resolvedBets: Int
    let marketsCreated: Int
    let net: Double
}
