import SwiftUI

struct MarketsView: View {
    @StateObject private var vm = MarketsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TopAppBar(title: "Markets", trailingSystemImage: "arrow.clockwise") {
                    Task { await vm.load() }
                }
                Group {
                    if vm.isLoading {
                        ProgressView("Loading Markets")
                            .tint(AppTheme.brand)
                    } else if let error = vm.errorMessage {
                        ContentUnavailableView("Unable to Load Markets", systemImage: "chart.line.uptrend.xyaxis", description: Text(error))
                    } else if vm.markets.isEmpty {
                        ContentUnavailableView("No Markets", systemImage: "list.bullet.rectangle")
                    } else {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 12) {
                                SectionTitle(title: "Live & Recent Markets")
                                ForEach(vm.markets) { market in
                                    NavigationLink(value: market) {
                                        AppCard {
                                            VStack(alignment: .leading, spacing: 8) {
                                                Text(market.question).fontWeight(.bold).foregroundStyle(AppTheme.textPrimary)
                                                HStack {
                                                    Label("\(Int(market.yesPrice * 100))% Yes", systemImage: "checkmark.circle.fill")
                                                        .foregroundStyle(AppTheme.yes)
                                                    Label("\(Int(market.noPrice * 100))% No", systemImage: "xmark.circle.fill")
                                                        .foregroundStyle(AppTheme.no)
                                                }
                                                .font(.caption)
                                                Text("Deadline: \(market.deadline.formatted(date: .abbreviated, time: .shortened))")
                                                    .font(.caption)
                                                    .foregroundStyle(AppTheme.textSecondary)
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
                }
                .navigationDestination(for: Market.self) { market in
                    MarketDetailView(market: market)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .ignoresSafeArea(edges: .top)
        .background(AppTheme.background)
        .task { await vm.load() }
    }
}
