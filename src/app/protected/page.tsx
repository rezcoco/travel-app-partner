"use client"

import { signIn, useSession } from "next-auth/react"
import React from "react"

const Protected = () => {
  const { data, status } = useSession()
  if (status === "unauthenticated")
    return (
      <>
        <h2>Please Login to access this page</h2>
        <button onClick={() => signIn("credentials")}>Sign In</button>
      </>
    )

  return <h2>Hello {data?.user.name}</h2>
}

export default Protected
