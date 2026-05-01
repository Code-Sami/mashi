import SwiftUI

struct GroupsView: View {
    @StateObject private var vm = GroupsViewModel()
    @State private var tab: GroupsTab = .yours
    @State private var showCreateGroup = false
    @State private var inviteCode = ""
    @State private var isJoiningInvite = false

    private enum GroupsTab: String, CaseIterable {
        case yours = "Yours"
        case explore = "Explore"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TopAppBar(title: "Groups", trailingSystemImage: "arrow.clockwise") {
                    Task {
                        await vm.load()
                        await vm.loadDiscover()
                    }
                }
                Picker("Section", selection: $tab) {
                    ForEach(GroupsTab.allCases, id: \.self) { t in
                        Text(t.rawValue).tag(t)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(AppTheme.background)

                if let actionError = vm.actionError {
                    Text(actionError)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)
                }

                Group {
                    switch tab {
                    case .yours:
                        yourGroupsContent
                    case .explore:
                        exploreContent
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .navigationDestination(for: MashiGroup.self) { group in
                    GroupDetailView(group: group)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .ignoresSafeArea(edges: .top)
        .background(AppTheme.background)
        .task {
            await vm.load()
            await vm.loadDiscover()
        }
        .onChange(of: tab) { _, newTab in
            if newTab == .explore {
                Task { await vm.loadDiscover() }
            }
        }
        .sheet(isPresented: $showCreateGroup) {
            CreateGroupSheet {
                Task {
                    await vm.load()
                    await vm.loadDiscover()
                }
            }
        }
    }

    @ViewBuilder
    private var yourGroupsContent: some View {
        if vm.isLoading {
            ProgressView("Loading Groups")
                .tint(AppTheme.brand)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = vm.errorMessage {
            ContentUnavailableView("Unable to Load Groups", systemImage: "person.3.sequence", description: Text(error))
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Button {
                        showCreateGroup = true
                    } label: {
                        AppCard {
                            HStack(spacing: 10) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(AppTheme.brand)
                                Text("Create a group")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Spacer()
                            }
                        }
                    }
                    .buttonStyle(.plain)

                    if vm.groups.isEmpty {
                        ContentUnavailableView("No Groups Yet", systemImage: "person.3")
                            .frame(maxWidth: .infinity)
                            .padding(.top, 24)
                    } else {
                        SectionTitle(title: "Your groups")
                        ForEach(vm.groups) { group in
                            NavigationLink(value: group) {
                                AppCard {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(group.name).fontWeight(.bold).foregroundStyle(AppTheme.textPrimary)
                                        if let description = group.description, !description.isEmpty {
                                            Text(description).font(.subheadline).foregroundStyle(AppTheme.textSecondary)
                                        }
                                        Text("\(group.memberCount) members • \(group.visibility)")
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
    }

    @ViewBuilder
    private var exploreContent: some View {
        if vm.exploreLoading && vm.exploreGroups.isEmpty {
            ProgressView("Loading…")
                .tint(AppTheme.brand)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = vm.exploreError {
            ContentUnavailableView("Unable to Load", systemImage: "exclamationmark.triangle", description: Text(error))
        } else if vm.exploreGroups.isEmpty {
            ContentUnavailableView("No public groups", systemImage: "globe", description: Text("Check back later for groups to join."))
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    AppCard {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionTitle(title: "Join by invite")
                            HStack(spacing: 8) {
                                TextField("Paste invite code", text: $inviteCode)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .textFieldStyle(.roundedBorder)
                                Button("Join") {
                                    Task { await joinByInvite() }
                                }
                                .buttonStyle(BrandPrimaryButtonStyle())
                                .disabled(inviteCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isJoiningInvite)
                            }
                        }
                    }
                    SectionTitle(title: "Public groups")
                    ForEach(vm.exploreGroups) { item in
                        AppCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text(item.name)
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("\(item.memberCount) members")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                                if item.hasPendingRequest {
                                    Text("Request pending")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(AppTheme.textSecondary)
                                } else {
                                    Button(item.visibility == "private" ? "Request access" : "Join group") {
                                        Task { await vm.joinExploreGroup(item) }
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

    private func joinByInvite() async {
        let code = inviteCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        isJoiningInvite = true
        defer { isJoiningInvite = false }
        vm.actionError = nil
        do {
            _ = try await APIClient.shared.acceptInvite(code: code)
            inviteCode = ""
            await vm.load()
            await vm.loadDiscover()
        } catch {
            vm.actionError = error.localizedDescription
        }
    }
}

private struct CreateGroupSheet: View {
    @Environment(\.dismiss) private var dismiss
    var onCreated: () -> Void

    @State private var name = ""
    @State private var isPrivate = false
    @State private var errorMessage: String?
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Group name", text: $name)
                Toggle("Private group", isOn: $isPrivate)
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("New group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await submit() } }
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                }
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            _ = try await APIClient.shared.createGroup(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                visibility: isPrivate ? "private" : "public"
            )
            onCreated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
