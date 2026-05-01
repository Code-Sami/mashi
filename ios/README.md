# Mashi iOS (SwiftUI)

This directory contains a native SwiftUI refactor scaffold for Mashi.

## What is included

- SwiftUI app structure with tab navigation
- Domain models for users, groups, markets, and activity
- Async API client with `URLSession`
- View models for auth/session, groups, and markets
- Starter screens: Home, Groups, Markets, Profile

## Project generation

This repo includes an `XcodeGen` spec (`ios/project.yml`) so you can generate an Xcode project without manually editing `.pbxproj`.

1. Install XcodeGen:

```bash
brew install xcodegen
```

2. Generate project:

```bash
cd ios
xcodegen generate
open MashiIOS.xcodeproj
```

## Backend configuration

Set your API base URL in `MashiApp/APIClient.swift`:

- `http://localhost:3000` for simulator + local web backend
- your production HTTPS origin for real device testing

## Notes

- Current auth flow is scaffolded and uses placeholder login behavior.
- To fully replace web auth, expose a mobile-friendly token endpoint in your backend (instead of cookie-only session auth).
