import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from '../Layout.jsx'
import Home from '../Pages/Home.jsx'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout currentPageName="Home">
        <Home />
      </Layout>
    </QueryClientProvider>
  )
}