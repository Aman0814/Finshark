# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Stock API configuration

Stock search, quotes, basic company profiles, and portfolio additions use Yahoo
Finance's public search/chart endpoints when no FMP key is configured. For U.S. SEC filers,
annual income statements, balance sheets, cash flows, selected ratios, company
filing details, and 10-K links use SEC EDGAR without an API key. Historical
dividend events use Yahoo Finance's chart data. SEC requires a
descriptive User-Agent that includes a contact email. Set it as a .NET User
Secret from the frontend folder (replace the example address with your contact):

```powershell
dotnet user-secrets set "SECUserAgent" "FINSTOCKS/1.0 (contact: you@example.com)" --project ..\backend\backend.csproj
```

Restart the backend after setting it. SEC data availability and labels vary by
company and filing taxonomy; SEC filings do not provide DCF, sector, peer, or
general company-description data. Non-U.S. companies and unsupported
SEC facts may not have financial reports available through this fallback.

An FMP key remains optional and enables additional profile fields, peer data,
and broader international coverage. Keep it server-side in .NET
User Secrets; never add it to the browser build.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
