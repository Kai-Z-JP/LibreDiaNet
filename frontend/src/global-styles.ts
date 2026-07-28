import { css } from '@emotion/react'

export const globalStyles = css`
  :root {
    color: rgba(0, 0, 0, 0.87);
    background: #f0f0f0;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family: 'Noto Sans JP', sans-serif;
  }

  .preview-table thead {
    border: 3px solid #000;
    font-family: 'ヒラギノ明朝体3等幅', serif;
  }

  .preview-table td {
    padding: 0;
  }

  .preview-body-row td {
    text-align: center;
  }
`
