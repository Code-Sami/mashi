import SwiftUI
import UIKit

@main
struct MashiApp: App {
    @StateObject private var session = SessionViewModel()

    init() {
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.98, alpha: 1)
        nav.titleTextAttributes = [.foregroundColor: UIColor(red: 0.0, green: 0.2, blue: 0.13, alpha: 1)]
        nav.largeTitleTextAttributes = [.foregroundColor: UIColor(red: 0.0, green: 0.2, blue: 0.13, alpha: 1)]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UIColor.white
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
        UITabBar.appearance().tintColor = UIColor(red: 0.16, green: 0.80, blue: 0.58, alpha: 1)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(session)
        }
    }
}
