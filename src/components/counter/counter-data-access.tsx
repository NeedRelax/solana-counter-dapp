// src/app/counter/counter-data-access.tsx

'use client'

import { getCounterProgram, getCounterProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor' // <--- 导入 BN

export function useCounterProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getCounterProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getCounterProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['counter', 'all', { cluster }],
    queryFn: () => program.account.counterAccount.all(), // <--- 账户名从 counter 变为 counterAccount
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['counter', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      // 新的 initialize 指令需要 authority
      program.methods
        .initialize()
        .accounts({
          counter: keypair.publicKey,
          authority: provider.wallet.publicKey, // authority 是签名者
        })
        .signers([keypair]) // 新账户的 keypair 需要签名
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize account')
    },
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useCounterProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  // 我们需要 provider 来获取 authority (当前钱包用户)
  const provider = useAnchorProvider()
  const { program, accounts } = useCounterProgram()

  const accountQuery = useQuery({
    queryKey: ['counter', 'fetch', { cluster, account }],
    queryFn: () => program.account.counterAccount.fetch(account), // <--- 账户名从 counter 变为 counterAccount
  })

  // 移除 closeMutation

  // 移除 decrementMutation

  const incrementMutation = useMutation({
    mutationKey: ['counter', 'increment', { cluster, account }],
    mutationFn: () =>
      // increment 指令现在需要 authority
      program.methods
        .increment()
        .accounts({
          counter: account,
          authority: provider.wallet.publicKey,
        })
        .rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      accountQuery.refetch()
    },
    onError: (err) => {
      toast.error(`Failed to increment counter: ${err.message}`)
    },
  })

 // 新增：Close Mutation
 const closeMutation = useMutation({
  mutationKey: ['counter', 'close', { cluster, account }],
  mutationFn: () =>
    program.methods
      .close()
      .accounts({
        counter: account,
        authority: provider.wallet.publicKey,
      })
      .rpc(),
  onSuccess: async (tx) => {
    transactionToast(tx)
    // 关闭账户后，账户列表需要刷新
    await accounts.refetch()
    },
  onError: (err) => {
    toast.error(`Failed to close account: ${err.message}`)
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['counter', 'decrement', { cluster, account }],
    mutationFn: () =>
      // increment 指令现在需要 authority
      program.methods
        .decrement()
        .accounts({
          counter: account,
          authority: provider.wallet.publicKey,
        })
        .rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      accountQuery.refetch()
    },
    onError: (err) => {
      toast.error(`Failed to increment counter: ${err.message}`)
    },
  })

  const setMutation = useMutation({
    mutationKey: ['counter', 'set', { cluster, account }],
    // value 是 u64，所以我们使用 BN
    mutationFn: (value: number) =>
      program.methods
        .set(new BN(value)) // <--- 使用 BN 处理 u64
        .accounts({
          counter: account,
          authority: provider.wallet.publicKey,
        })
        .rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      accountQuery.refetch()
    },
    onError: (err) => {
      toast.error(`Failed to set counter value: ${err.message}`)
    },
  })
  

  return {
    accountQuery,
    incrementMutation,
    decrementMutation,
    setMutation,
    closeMutation,
  }
}