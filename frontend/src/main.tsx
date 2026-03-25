import { createTheme, ThemeProvider } from '@mui/material/styles'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const theme = createTheme({
  palette: {
    background: {
      default: '#f0f0f0',
      paper: '#f8f9ff',
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>,
)
