# Solana Counter dApp

这是一个基于 Solana、Anchor 和 Next.js 构建的简单计数器 dApp。它允许用户创建、增加、减少和关闭一个链上计数器。

## 功能

*   **Initialize**: 创建一个新的计数器账户，所有权归创建者。
*   **Increment**: 将计数器的值加一。只有所有者可以执行。
*   **Decrement**: 将计数器的值减一。只有所有者可以执行。
*   **Set**: 设置计数器为一个特定的值。只有所有者可以执行。
*   **Close**: 关闭计数器账户并将租金返还给所有者。

## 技术栈

*   **智能合约**: Rust, Anchor Framework
*   **前端**: Next.js, TypeScript, Tailwind CSS
*   **Solana**: `@solana/web3.js`, `@solana/wallet-adapter`

## 环境要求

*   Node.js (v18+)
*   Rust
*   Solana CLI
*   Anchor Framework (`avm install latest`)

## 本地开发

1.  **克隆仓库**
    ```bash
    git clone <你的_GITHUB_仓库_URL>
    cd solana-counter-dapp
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **构建合约**
    ```bash
    anchor build
    ```

4.  **运行测试**
    这将启动一个本地 Solana 验证器并运行集成测试。
    ```bash
    anchor test
    ```

5.  **运行前端开发服务器**
    ```bash
    npm run dev
    ```
    在浏览器中打开 `http://localhost:3000`。

## 部署

合约可以部署到 Localnet, Devnet, 或 Mainnet。

1.  **设置网络**
    ```bash
    # 对于 Devnet
    solana config set --url devnet
    ```

2.  **部署合约**
    确保你的钱包有足够的 SOL 来支付部署费用。
    ```bash
    anchor deploy
    ```
    部署后，记得更新前端代码中的 `PROGRAM_ID` 和 `Anchor.toml` 中的程序地址。

## CI/CD

本项目使用 GitHub Actions 进行持续集成和部署。每次推送到 `main` 分支时，会触发以下工作流：
1.  **Build and Test**: 自动构建合约并运行 `anchor test`。
2.  **Deploy to Devnet**: 如果测试通过，合约将自动部署到 Devnet。

部署者密钥存储在 GitHub Secrets 的 `SOLANA_KEYPAIR_SECRET` 中。