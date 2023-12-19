"use client"

import { getServerSession } from "next-auth"
import { signIn } from "next-auth/react"
import React from "react"

const Protected = async () => {
  const auth = await getServerSession()
  if (!auth)
    return (
      <>
        <h2>Please Login to access this page</h2>
        <button onClick={() => signIn("credentials")}>Sign In</button>
      </>
    )

  return <h2>Hello {auth.user.name}</h2>
}

export default Protected
