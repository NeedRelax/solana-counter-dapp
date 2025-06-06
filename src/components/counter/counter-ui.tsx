// src/app/counter/counter-ui.tsx

'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useCounterProgram, useCounterProgramAccount } from './counter-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { toast } from 'sonner'

export function CounterCreate() {
  const { initialize } = useCounterProgram()
  return (
    <Button variant="default" onClick={() => initialize.mutateAsync(Keypair.generate())} disabled={initialize.isPending}>
      Create {initialize.isPending && '...'}
    </Button>
  )
}

export function CounterList() {
  const { accounts, getProgramAccount } = useCounterProgram()

  if (getProgramAccount.isLoading) {
    return <div className="w-full text-center"><span className="loading loading-spinner loading-lg"></span></div>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }

  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <div className="w-full text-center"><span className="loading loading-spinner loading-lg"></span></div>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <CounterCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function CounterCard({ account }: { account: PublicKey }) {
  const { publicKey } = useWallet()
  const { accountQuery, incrementMutation, decrementMutation, setMutation ,closeMutation} = useCounterProgramAccount({
    account,
  })

  // 这两个 useMemo 会在 accountQuery.data 可用时更新
  const count = useMemo(() => accountQuery.data?.count.toNumber() ?? 0, [accountQuery.data?.count])
  const authority = useMemo(() => accountQuery.data?.authority, [accountQuery.data?.authority])

  // ==================== THE FIX IS HERE ====================
  // 只有在 publicKey 和 authority 都存在时才进行比较
  const isAuthority = useMemo(() => {
    if (!publicKey || !authority) {
      return false
    }
    return publicKey.equals(authority)
  }, [publicKey, authority])
  // =========================================================

  // 在 accountQuery 完成加载前，显示加载状态
  if (accountQuery.isLoading) {
    return (
        <Card>
            <CardHeader>
                <div className="w-full text-center p-4">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            </CardHeader>
        </Card>
    )
  }

  // 如果没有数据（可能是一个无效的账户地址），显示错误
  if (!accountQuery.data) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Account not found</CardTitle>
                <CardDescription>
                    Could not fetch data for account <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
                </CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Count: {count}</CardTitle>
        <CardDescription className="flex flex-col space-y-1">
          <span>
            Account: <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
          </span>
          {authority && (
            <span>
              Authority: <ExplorerLink path={`account/${authority}`} label={ellipsify(authority.toString())} />
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthority ? (
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => incrementMutation.mutateAsync()}
              disabled={incrementMutation.isPending}
            >
              Increment
            </Button>
            <Button
              variant="outline"
              onClick={() => decrementMutation.mutateAsync()}
              disabled={decrementMutation.isPending}
            >
              Decrement
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const value = window.prompt('Set value to:', count.toString() ?? '0')
                if (value === null || value.trim() === '' || isNaN(parseInt(value))) {
                  toast.warning('Please enter a valid number.')
                  return
                }
                if (parseInt(value) === count) {
                  return
                }
                return setMutation.mutateAsync(parseInt(value))
              }}
              disabled={setMutation.isPending}
            >
              Set
            </Button>
            {/* 新增 Close 按钮 */}
            <Button
              variant="destructive"
              onClick={() => {
                if (!window.confirm('Are you sure you want to close this account? This action is irreversible.')) {
                  return
                }
                return closeMutation.mutateAsync()
              }}
              disabled={closeMutation.isPending}
            >
              Close
            </Button>
          </div>
        ) : (
          // 仅当钱包连接了，但又不是authority时，才显示这个消息
          publicKey && <p className="text-sm text-gray-400">You are not the authority for this account.</p>
        )}
      </CardContent>
    </Card>
  )
}