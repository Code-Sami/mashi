import SwiftUI
import Charts

private enum ActivityNavigationTarget: Hashable {
    case market(id: String, fallbackQuestion: String)
    case user(id: String, fallbackName: String)
}

enum AppTheme {
    static let background = Color(red: 0.97, green: 0.98, blue: 0.98)
    static let surface = Color.white
    static let brand = Color(red: 0.16, green: 0.80, blue: 0.58)
    static let brandHover = Color(red: 0.13, green: 0.71, blue: 0.51)
    static let brandDark = Color(red: 0.00, green: 0.20, blue: 0.13)
    static let textPrimary = Color.black.opacity(0.9)
    static let textSecondary = Color.black.opacity(0.55)
    static let border = Color.black.opacity(0.08)
    static let cardShadow = Color.black.opacity(0.06)
    static let yes = Color(red: 0.15, green: 0.36, blue: 1.0)
    static let no = Color(red: 0.67, green: 0.00, blue: 1.0)
}

struct BrandPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(AppTheme.brandDark)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(configuration.isPressed ? AppTheme.brandHover : AppTheme.brand)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.99 : 1.0)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct AppCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(AppTheme.border)
            )
            .shadow(color: AppTheme.cardShadow, radius: 6, y: 1)
    }
}

struct SectionTitle: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline.weight(.semibold))
            .foregroundStyle(AppTheme.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct TopAppBar: View {
    let title: String
    var trailingSystemImage: String? = nil
    var onTrailingTap: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            Text("M")
                .font(.headline.weight(.heavy))
                .foregroundStyle(AppTheme.brandDark)
                .frame(width: 30, height: 30)
                .background(AppTheme.brand)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(Color.white)
            Spacer()
            if let trailingSystemImage, let onTrailingTap {
                Button(action: onTrailingTap) {
                    Image(systemName: trailingSystemImage)
                        .font(.headline)
                        .foregroundStyle(AppTheme.brand)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.brandDark)
    }
}

struct ContentView: View {
    @EnvironmentObject private var session: SessionViewModel

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()
            if session.isLoading && !session.isAuthenticated {
                ProgressView("Loading")
                    .tint(AppTheme.brand)
            } else if session.isAuthenticated {
                TabView {
                    HomeView()
                        .tabItem {
                            Label("Home", systemImage: "house.fill")
                        }
                    GroupsView()
                        .tabItem {
                            Label("Groups", systemImage: "person.3.fill")
                        }
                    MarketsView()
                        .tabItem {
                            Label("Markets", systemImage: "chart.line.uptrend.xyaxis")
                        }
                    ProfileView()
                        .tabItem {
                            Label("Profile", systemImage: "person.circle.fill")
                        }
                    NotificationsView()
                        .tabItem {
                            Label("Alerts", systemImage: "bell.fill")
                        }
                }
                .tint(AppTheme.brandDark)
            } else {
                LoginView()
            }
        }
    }
}

private struct LoginView: View {
    @EnvironmentObject private var session: SessionViewModel
    @State private var mode: AuthMode = .login
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""

    private enum AuthMode: String, CaseIterable, Identifiable {
        case login = "Log In"
        case register = "Sign Up"
        var id: String { rawValue }
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 12) {
                    Text("M")
                        .font(.headline.weight(.heavy))
                        .foregroundStyle(AppTheme.brandDark)
                        .frame(width: 30, height: 30)
                        .background(AppTheme.brand)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    Text("Mashi")
                        .font(.system(size: 36, weight: .heavy))
                        .foregroundStyle(Color.white)
                }
                Text("Your group chat already makes predictions. Now make them count.")
                    .font(.subheadline)
                    .foregroundStyle(Color.white.opacity(0.72))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .background(AppTheme.brandDark)

            VStack(spacing: 14) {
                Picker("Auth mode", selection: $mode) {
                    ForEach(AuthMode.allCases) { item in
                        Text(item.rawValue).tag(item)
                    }
                }
                .pickerStyle(.segmented)
                .tint(AppTheme.brandDark)
                .colorScheme(.light)
                if mode == .register {
                    TextField("First name", text: $firstName)
                        .textFieldStyle(.roundedBorder)
                        .foregroundStyle(AppTheme.textPrimary)
                    TextField("Last name", text: $lastName)
                        .textFieldStyle(.roundedBorder)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                TextField("Email", text: $email)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.emailAddress)
                    .foregroundStyle(AppTheme.textPrimary)
                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .foregroundStyle(AppTheme.textPrimary)
                if let error = session.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                Button(mode == .login ? "Log In" : "Create Account") {
                    Task {
                        if mode == .login {
                            await session.login(
                                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                                password: password
                            )
                        } else {
                            await session.register(
                                firstName: firstName.trimmingCharacters(in: .whitespacesAndNewlines),
                                lastName: lastName.trimmingCharacters(in: .whitespacesAndNewlines),
                                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                                password: password
                            )
                        }
                    }
                }
                .buttonStyle(BrandPrimaryButtonStyle())
                .disabled(
                    email.isEmpty ||
                    password.isEmpty ||
                    (mode == .register && (firstName.isEmpty || lastName.isEmpty || password.count < 8)) ||
                    session.isLoading
                )
            }
            .padding(20)
            .background(AppTheme.brandDark)
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppTheme.brandDark.ignoresSafeArea())
    }
}

private struct HomeView: View {
    @StateObject private var vm = HomeViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Loading")
                } else if let error = vm.errorMessage {
                    ContentUnavailableView("Unable to Load", systemImage: "exclamationmark.triangle", description: Text(error))
                } else if let dashboard = vm.dashboard {
                    VStack(spacing: 0) {
                        TopAppBar(title: "Mashi")

                        ScrollView {
                            VStack(alignment: .leading, spacing: 14) {
                                SectionTitle(title: "Key Stats")
                            HStack(spacing: 10) {
                                StatPill(title: "Active", value: "\(dashboard.stats.activeMarkets)")
                                StatPill(title: "Total Bets", value: "\(dashboard.stats.totalBets)")
                            }
                            HStack(spacing: 10) {
                                StatPill(title: "Gross Winnings", value: money(dashboard.stats.grossWinnings))
                                StatPill(title: "Net P/L", value: money(dashboard.stats.netPnL), positive: dashboard.stats.netPnL >= 0)
                            }

                            SectionTitle(title: "Expiring Soon")
                            ForEach(dashboard.expiringSoon.prefix(5)) { market in
                                NavigationLink(value: market) {
                                    AppCard {
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(market.question)
                                                .font(.body.weight(.semibold))
                                                .foregroundStyle(AppTheme.textPrimary)
                                                HStack(spacing: 10) {
                                                    Text("Yes \(Int(market.yesPrice * 100))%")
                                                        .font(.caption.weight(.semibold))
                                                        .foregroundStyle(AppTheme.yes)
                                                    Text("No \(Int(market.noPrice * 100))%")
                                                        .font(.caption.weight(.semibold))
                                                        .foregroundStyle(AppTheme.no)
                                                    Spacer()
                                                    Text(timeRemaining(until: market.deadline))
                                                        .font(.caption.weight(.bold))
                                                        .foregroundStyle(AppTheme.brandDark)
                                                }
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }

                            SectionTitle(title: "New Markets")
                            ForEach(dashboard.newMarkets.prefix(5)) { market in
                                NavigationLink(value: market) {
                                    AppCard {
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(market.question)
                                                .font(.body.weight(.semibold))
                                                .foregroundStyle(AppTheme.textPrimary)
                                                HStack(spacing: 10) {
                                                    Text("Yes \(Int(market.yesPrice * 100))%")
                                                        .font(.caption.weight(.semibold))
                                                        .foregroundStyle(AppTheme.yes)
                                                    Text("No \(Int(market.noPrice * 100))%")
                                                        .font(.caption.weight(.semibold))
                                                        .foregroundStyle(AppTheme.no)
                                                }
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }

                            SectionTitle(title: "Friend Activity")
                            ForEach(dashboard.friendActivity.prefix(8)) { item in
                                if let marketID = item.marketID, !marketID.isEmpty {
                                    NavigationLink(value: ActivityNavigationTarget.market(id: marketID, fallbackQuestion: item.marketQuestion ?? "Market")) {
                                        activityCard(item)
                                    }
                                    .buttonStyle(.plain)
                                } else if let actorUserID = item.actorUserID, !actorUserID.isEmpty {
                                    NavigationLink(value: ActivityNavigationTarget.user(id: actorUserID, fallbackName: item.actorName)) {
                                        activityCard(item)
                                    }
                                    .buttonStyle(.plain)
                                } else {
                                    activityCard(item)
                                }
                            }

                            SectionTitle(title: "Recent Wins & Losses")
                            ForEach(dashboard.recentResolvedBets.prefix(8)) { bet in
                                NavigationLink(value: ActivityNavigationTarget.market(id: bet.marketID, fallbackQuestion: bet.marketQuestion)) {
                                    AppCard {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(bet.marketQuestion)
                                                .font(.subheadline.weight(.semibold))
                                                .foregroundStyle(AppTheme.textPrimary)
                                            HStack {
                                                Text(bet.result.uppercased())
                                                    .font(.caption.weight(.bold))
                                                    .foregroundStyle(bet.result == "win" ? AppTheme.brand : AppTheme.no)
                                                Spacer()
                                                Text(money(bet.pnl))
                                                    .font(.caption.weight(.bold))
                                                    .foregroundStyle(bet.pnl >= 0 ? AppTheme.brand : AppTheme.no)
                                            }
                                            if let createdAt = bet.createdAt {
                                                Text(createdAt, style: .relative)
                                                    .font(.caption)
                                                    .foregroundStyle(AppTheme.textSecondary)
                                            }
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                        }
                    }
                } else {
                    ContentUnavailableView("No Data", systemImage: "chart.bar.xaxis")
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Market.self) { market in
                MarketDetailView(market: market)
            }
            .navigationDestination(for: ActivityNavigationTarget.self) { target in
                switch target {
                case .market(let id, let fallbackQuestion):
                    ActivityMarketDestinationView(marketID: id, fallbackQuestion: fallbackQuestion)
                case .user(let id, let fallbackName):
                    FriendProfileView(userID: id, fallbackName: fallbackName)
                }
            }
        }
        .ignoresSafeArea(edges: .top)
        .task { await vm.load() }
    }

    private func money(_ value: Double) -> String {
        let sign = value >= 0 ? "+" : "-"
        return "\(sign)$\(Int(abs(value)))"
    }

    private func timeRemaining(until deadline: Date) -> String {
        let remaining = max(0, Int(deadline.timeIntervalSinceNow))
        let hours = remaining / 3600
        let minutes = (remaining % 3600) / 60
        if hours >= 24 {
            let days = hours / 24
            return "\(days)d left"
        }
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m left"
    }

    @ViewBuilder
    private func activityCard(_ item: ActivityItem) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.actorName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(item.summary)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                Text(item.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }
}

private struct StatPill: View {
    let title: String
    let value: String
    var positive: Bool = true

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                Text(value)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(positive ? AppTheme.brandDark : AppTheme.no)
            }
        }
    }
}

private struct ProfileView: View {
    @EnvironmentObject private var session: SessionViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TopAppBar(title: "Profile")
                VStack(spacing: 16) {
                    if let user = session.user {
                        Text(user.displayName).font(.title2).fontWeight(.bold).foregroundStyle(AppTheme.textPrimary)
                        Text(user.username ?? "").foregroundStyle(AppTheme.textSecondary)
                    }
                    Button("Log Out") {
                        session.logout()
                    }
                    .buttonStyle(BrandPrimaryButtonStyle())
                }
                .padding(24)
                .background(AppTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(AppTheme.border))
                .padding(16)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .ignoresSafeArea(edges: .top)
    }
}

private struct NotificationsView: View {
    @StateObject private var vm = NotificationsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TopAppBar(title: "Alerts", trailingSystemImage: "checkmark.circle") {
                    Task { await vm.markAllRead() }
                }
                if vm.isLoading {
                    ProgressView("Loading alerts...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                } else if let error = vm.errorMessage {
                    ContentUnavailableView("Unable to Load", systemImage: "exclamationmark.triangle", description: Text(error))
                } else if vm.notifications.isEmpty {
                    ContentUnavailableView("No Alerts", systemImage: "bell.slash")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 10) {
                            ForEach(vm.notifications) { item in
                                AppCard {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(notificationTitle(item))
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(AppTheme.textPrimary)
                                        if let actor = item.actorName {
                                            Text(actor)
                                                .font(.caption)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        if let message = item.message, !message.isEmpty {
                                            Text(message)
                                                .font(.caption)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        if let createdAt = item.createdAt {
                                            Text(createdAt, style: .relative)
                                                .font(.caption2)
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }
                                        if item.readAt == nil {
                                            Button("Mark Read") {
                                                Task { await vm.markRead(item.id) }
                                            }
                                            .buttonStyle(BrandPrimaryButtonStyle())
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .ignoresSafeArea(edges: .top)
        .task { await vm.load() }
    }

    private func notificationTitle(_ item: MobileNotification) -> String {
        switch item.type {
        case "market_tagged":
            return "You were tagged in a market"
        case "umpire_assigned":
            return "You were assigned as umpire"
        case "umpire_market_expired":
            return "A market needs umpire action"
        case "market_bet_resolved":
            return "A market you bet in was resolved"
        case "group_join_request_submitted":
            return "New join request in your group"
        case "group_join_request_approved":
            return "Your join request was approved"
        case "group_join_request_denied":
            return "Your join request was denied"
        default:
            return "New alert"
        }
    }
}

struct GroupDetailView: View {
    let group: MashiGroup
    @State private var markets: [Market] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showCreateMarket = false

    var body: some View {
        VStack(spacing: 0) {
            TopAppBar(title: group.name)
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    AppCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(group.name)
                                .font(.headline.weight(.bold))
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("\(group.memberCount) members • \(group.visibility.capitalized)")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                            if let description = group.description, !description.isEmpty {
                                Text(description)
                                    .font(.subheadline)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }

                    Button {
                        showCreateMarket = true
                    } label: {
                        AppCard {
                            HStack(spacing: 10) {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(AppTheme.brand)
                                Text("Create a market")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Spacer()
                            }
                        }
                    }
                    .buttonStyle(.plain)

                    SectionTitle(title: "Markets")
                    if isLoading {
                        ProgressView("Loading Markets")
                            .tint(AppTheme.brand)
                    } else if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    } else if filteredMarkets.isEmpty {
                        AppCard { Text("No markets in this group yet.").foregroundStyle(AppTheme.textSecondary) }
                    } else {
                        ForEach(filteredMarkets) { market in
                            NavigationLink(value: market) {
                                AppCard {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(market.question).fontWeight(.semibold).foregroundStyle(AppTheme.textPrimary)
                                        Text("Yes \(Int(market.yesPrice * 100))%  •  No \(Int(market.noPrice * 100))%")
                                            .font(.caption)
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .ignoresSafeArea(edges: .top)
        .navigationDestination(for: Market.self) { market in
            MarketDetailView(market: market)
        }
        .sheet(isPresented: $showCreateMarket) {
            CreateMarketSheet(groupID: group.id) { newMarket in
                markets.insert(newMarket, at: 0)
            }
        }
        .task { await loadMarkets() }
    }

    private var filteredMarkets: [Market] {
        markets.filter { $0.groupID == group.id }
    }

    private func loadMarkets() async {
        isLoading = true
        defer { isLoading = false }
        do {
            markets = try await APIClient.shared.fetchMarkets()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct CreateMarketSheet: View {
    let groupID: String
    var onCreated: (Market) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var question = ""
    @State private var deadline = Date().addingTimeInterval(86_400)
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Question", text: $question, axis: .vertical)
                    .lineLimit(3...6)
                DatePicker("Deadline", selection: $deadline, displayedComponents: [.date, .hourAndMinute])
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("New market")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await submit() } }
                        .disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                }
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }
        let q = question.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let market = try await APIClient.shared.createMarket(groupID: groupID, question: q, deadline: deadline)
            onCreated(market)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct MarketDetailView: View {
    let market: Market
    @State private var detail: MarketDetail?
    @State private var history: [MarketHistoryPoint] = []
    @State private var recentBets: [RecentBet] = []
    @State private var betAmount = "10"
    @State private var isSubmittingBet = false
    @State private var betError: String?
    @State private var isLoading = true

    init(market: Market) {
        self.market = market
    }

    var body: some View {
        VStack(spacing: 0) {
            TopAppBar(title: "Market")
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    AppCard {
                        Text(currentMarket.question)
                            .font(.headline)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    AppCard {
                        VStack(alignment: .leading, spacing: 10) {
                            LabeledContent("Status", value: currentMarket.status.capitalized)
                            LabeledContent("Yes Price", value: "\(Int(currentMarket.yesPrice * 100))%")
                            LabeledContent("No Price", value: "\(Int(currentMarket.noPrice * 100))%")
                            LabeledContent("Volume", value: "\(Int(currentMarket.totalVolume))")
                            LabeledContent("Deadline", value: currentMarket.deadline.formatted(date: .abbreviated, time: .shortened))
                            if let outcome = currentMarket.outcome {
                                LabeledContent("Outcome", value: outcome.uppercased())
                            }
                        }
                        .foregroundStyle(AppTheme.textPrimary)
                    }
                    AppCard {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionTitle(title: "Price Chart")
                            Chart {
                                ForEach(history) { point in
                                    if let t = point.createdAt {
                                        LineMark(
                                            x: .value("Time", t),
                                            y: .value("Yes", point.yesPrice)
                                        )
                                        .foregroundStyle(AppTheme.yes)
                                        LineMark(
                                            x: .value("Time", t),
                                            y: .value("No", point.noPrice)
                                        )
                                        .foregroundStyle(AppTheme.no)
                                    }
                                }
                            }
                            .frame(height: 180)
                            .chartYScale(domain: 0...1)
                        }
                    }
                    AppCard {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionTitle(title: "Place Bet")
                            TextField("Amount (1-100)", text: $betAmount)
                                .keyboardType(.numberPad)
                                .textFieldStyle(.roundedBorder)
                            HStack(spacing: 10) {
                                Button("Bet YES") { Task { await submitBet(side: "yes") } }
                                    .buttonStyle(BrandPrimaryButtonStyle())
                                    .disabled(!canBet || isSubmittingBet)
                                Button("Bet NO") { Task { await submitBet(side: "no") } }
                                    .buttonStyle(BrandPrimaryButtonStyle())
                                    .disabled(!canBet || isSubmittingBet)
                            }
                            if let betError {
                                Text(betError)
                                    .font(.footnote)
                                    .foregroundStyle(.red)
                            }
                        }
                    }
                    if currentMarket.canResolve {
                        AppCard {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionTitle(title: "Resolution")
                                HStack(spacing: 10) {
                                    Button("Resolve YES") { Task { await resolve("yes") } }
                                        .buttonStyle(BrandPrimaryButtonStyle())
                                    Button("Resolve NO") { Task { await resolve("no") } }
                                        .buttonStyle(BrandPrimaryButtonStyle())
                                }
                                HStack(spacing: 10) {
                                    Button("Dispute") { Task { await dispute() } }
                                        .buttonStyle(BrandPrimaryButtonStyle())
                                    Button("Accept") { Task { await accept() } }
                                        .buttonStyle(BrandPrimaryButtonStyle())
                                }
                            }
                        }
                    }
                    AppCard {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionTitle(title: "Recent Bets")
                            if recentBets.isEmpty {
                                Text("No bets yet.")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                ForEach(recentBets.prefix(12)) { b in
                                    HStack {
                                        Text(b.userName)
                                            .font(.caption.weight(.semibold))
                                        Spacer()
                                        Text("\(b.side.uppercased()) $\(Int(b.amount))")
                                            .font(.caption.weight(.bold))
                                            .foregroundStyle(b.side == "yes" ? AppTheme.yes : AppTheme.no)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .ignoresSafeArea(edges: .top)
        .overlay {
            if isLoading {
                ProgressView("Loading market...")
            }
        }
        .task { await loadDetail() }
    }

    private var canBet: Bool {
        guard let amount = Int(betAmount), amount > 0, amount <= 100 else { return false }
        if currentMarket.status != "open" { return false }
        return currentMarket.deadline > Date()
    }

    private var currentMarket: MarketDetail {
        detail ?? MarketDetail(
            id: market.id,
            question: market.question,
            groupID: market.groupID,
            deadline: market.deadline,
            status: market.status,
            outcome: nil,
            yesPrice: market.yesPrice,
            noPrice: market.noPrice,
            totalVolume: 0,
            umpireID: "",
            canResolve: false
        )
    }

    private func submitBet(side: String) async {
        guard let amount = Int(betAmount), amount > 0, amount <= 100 else {
            betError = "Enter a valid amount between 1 and 100."
            return
        }
        isSubmittingBet = true
        defer { isSubmittingBet = false }
        do {
            _ = try await APIClient.shared.placeBet(marketID: currentMarket.id, side: side, amount: amount)
            await loadDetail()
            betError = nil
        } catch {
            betError = error.localizedDescription
        }
    }

    private func loadDetail() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let payload = try await APIClient.shared.fetchMarketDetail(marketID: market.id)
            detail = payload.market
            history = payload.history
            recentBets = payload.recentBets
            betError = nil
        } catch {
            betError = error.localizedDescription
        }
    }

    private func resolve(_ outcome: String) async {
        do {
            try await APIClient.shared.resolveMarket(marketID: currentMarket.id, outcome: outcome)
            await loadDetail()
        } catch {
            betError = error.localizedDescription
        }
    }

    private func dispute() async {
        do {
            try await APIClient.shared.disputeMarket(marketID: currentMarket.id)
            await loadDetail()
        } catch {
            betError = error.localizedDescription
        }
    }

    private func accept() async {
        do {
            try await APIClient.shared.acceptMarketResolution(marketID: currentMarket.id)
            await loadDetail()
        } catch {
            betError = error.localizedDescription
        }
    }
}

private struct ActivityMarketDestinationView: View {
    let marketID: String
    let fallbackQuestion: String
    @State private var market: Market?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let market {
                MarketDetailView(market: market)
            } else if isLoading {
                ProgressView("Opening market...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            } else if let errorMessage {
                ContentUnavailableView("Unable to Open Market", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else {
                ContentUnavailableView("Market Not Found", systemImage: "chart.line.uptrend.xyaxis", description: Text(fallbackQuestion))
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let markets = try await APIClient.shared.fetchMarkets()
            market = markets.first(where: { $0.id == marketID })
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct FriendProfileView: View {
    let userID: String
    let fallbackName: String
    @State private var profile: PublicUserProfile?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            TopAppBar(title: "Profile")
            Group {
                if isLoading {
                    ProgressView("Loading profile...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                } else if let errorMessage {
                    ContentUnavailableView("Unable to Load Profile", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                } else if let profile {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            AppCard {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(profile.user.name)
                                        .font(.title3.weight(.bold))
                                        .foregroundStyle(AppTheme.textPrimary)
                                    Text(profile.user.email)
                                        .font(.subheadline)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                            SectionTitle(title: "Stats")
                            HStack(spacing: 10) {
                                StatPill(title: "Bets", value: "\(profile.stats.betsPlaced)")
                                StatPill(title: "Resolved", value: "\(profile.stats.resolvedBets)")
                            }
                            HStack(spacing: 10) {
                                StatPill(title: "Markets", value: "\(profile.stats.marketsCreated)")
                                StatPill(title: "Net", value: money(profile.stats.net), positive: profile.stats.net >= 0)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                    }
                } else {
                    ContentUnavailableView("No Profile Data", systemImage: "person.crop.circle", description: Text(fallbackName))
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .toolbar(.hidden, for: .navigationBar)
        .ignoresSafeArea(edges: .top)
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            profile = try await APIClient.shared.fetchUserProfile(userID: userID)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func money(_ value: Double) -> String {
        let sign = value >= 0 ? "+" : "-"
        return "\(sign)$\(Int(abs(value)))"
    }
}
