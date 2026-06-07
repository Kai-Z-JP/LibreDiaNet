import { Global } from '@emotion/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import App from './App'
import LibreDiaNetProPage from './features/libre-dianet-pro/libre-dianet-pro-page'
import { globalStyles } from './global-styles'

const theme = createTheme({
  palette: {
    background: {
      default: '#fff',
    },
    primary: {
      main: '#1976d2',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
  },
  shape: {
    borderRadius: 4,
  },
})

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <Global styles={globalStyles} />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pro" element={<LibreDiaNetProPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>,
)
