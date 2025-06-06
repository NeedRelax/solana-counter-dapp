import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { Keypair, SystemProgram } from "@solana/web3.js";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Counter as Program<Counter>;
  const counterAccount = Keypair.generate();
  const otherUser = Keypair.generate();

  beforeAll(async () => {
    const connection = provider.connection;
    const airdropSig = await connection.requestAirdrop(
      otherUser.publicKey,
      1_000_000_000 // 1 SOL
    );
    await connection.confirmTransaction({
      signature: airdropSig,
      commitment: "confirmed",
    });
  });

  test("Initializes the counter", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counterAccount.publicKey,
        authority: otherUser.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([counterAccount, otherUser])
      .rpc();

    console.log("Your transaction signature", tx);

    const accountData = await program.account.counterAccount.fetch(
      counterAccount.publicKey
    );

    expect(accountData.count.toNumber()).toBe(0);
    expect(accountData.authority.equals(otherUser.publicKey)).toBe(true);
    console.log("Counter initialized. Count:", accountData.count.toString());
    console.log("Authority:", accountData.authority.toBase58());
  });

  test("Increments the counter", async () => {
    const tx = await program.methods
      .increment()
      .accounts({
        counter: counterAccount.publicKey,
        authority: otherUser.publicKey,
      })
      .signers([otherUser])
      .rpc();

    console.log("Increment transaction signature", tx);

    const accountData = await program.account.counterAccount.fetch(
      counterAccount.publicKey
    );

    expect(accountData.count.toNumber()).toBe(1);
    console.log("Counter incremented. New count:", accountData.count.toString());
  });

  test('Decrements the counter', async () => {
    await program.methods
      .decrement()
      .accounts({
        counter: counterAccount.publicKey,
        authority: otherUser.publicKey,
      })
      .signers([otherUser])
      .rpc();

    const accountData = await program.account.counterAccount.fetch(
      counterAccount.publicKey
    );
    // 断言: 计数值从 1 减少到 0
    expect(accountData.count.toNumber()).toBe(0);
  });

  test('Sets the counter to a specific value', async () => {
    const newValue = new anchor.BN(42);
    await program.methods
      .set(newValue)
      .accounts({
        counter: counterAccount.publicKey,
        authority: otherUser.publicKey,
      })
      .signers([otherUser])
      .rpc();

    const accountData = await program.account.counterAccount.fetch(
      counterAccount.publicKey
    );
    // 断言: 计数值被设置为新值 42
    expect(accountData.count.toNumber()).toBe(newValue.toNumber());
  });
  
  test('Fails to close the counter account by a non-authority', async () => {
    // 尝试使用一个新的、未经授权的 keypair 来关闭账户
    const unauthorizedUser = Keypair.generate();

    // 我们预期这个操作会因为 `has_one = authority` 约束而失败
    // 使用 expect(...).rejects.toThrow() 来捕获并断言预期的错误
    await expect(
      program.methods
        .close()
        .accounts({
          counter: counterAccount.publicKey,
          authority: unauthorizedUser.publicKey, // 错误的 authority
        })
        .signers([unauthorizedUser]) // 由错误的 authority 签名
        .rpc()
    ).rejects.toThrow();

    console.log("Successfully blocked unauthorized close attempt.");
  });
  test('Closes the counter account', async () => {
    // 首先，获取 authority 关闭账户前的余额
    const authorityInitialBalance = await provider.connection.getBalance(otherUser.publicKey);
    
    // 调用 close 指令，由合法的 authority (otherUser) 签名
    const tx = await program.methods
      .close()
      .accounts({
        counter: counterAccount.publicKey,
        authority: otherUser.publicKey,
      })
      .signers([otherUser])
      .rpc();

    console.log("Close account transaction signature", tx);

    // 其次，获取 authority 关闭账户后的余额
    const authorityFinalBalance = await provider.connection.getBalance(otherUser.publicKey);

    // 断言：账户关闭后，租金已返还，所以 authority 的余额应该增加了
    expect(authorityFinalBalance).toBeGreaterThan(authorityInitialBalance);
    console.log("Authority received rent back.");

    // 最关键的断言：尝试再次获取已关闭的账户信息
    // 这应该会抛出一个错误，因为账户已经不存在了
    try {
      await program.account.counterAccount.fetch(counterAccount.publicKey);
      // 如果 fetch 成功了，说明账户没有被关闭，测试失败
      fail("The account should have been closed, but it was still found.");
    } catch (error) {
      // 我们预期会捕获到一个错误，这证明账户已被成功删除
      // 错误信息通常会包含 "Account does not exist"
      expect(error.message).toContain("Account does not exist");
      console.log("Confirmed: Account is successfully closed and cannot be fetched.");
    }
  });
});
