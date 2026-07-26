import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HistoryPage } from '../features/history/widgets/HistoryPage'

describe('HistoryPage', () => {
  it('renders the first page of transactions and a load-more hint when more history exists', () => {
    render(<HistoryPage />)

    expect(screen.getByText('Transaction History')).toBeInTheDocument()
    expect(screen.getByText('Scroll to load more')).toBeInTheDocument()
  })
})
