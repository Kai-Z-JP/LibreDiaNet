import styled from '@emotion/styled'

export const ProPreviewStyleScope = styled.div`
  .pro-preview-table {
    width: max-content;
    border: 3px solid #000;
    border-collapse: collapse;
    background: white;
    color: #000;
    font-family: 'ヒラギノ明朝 ProN', serif;
    line-height: 1.15;
    table-layout: fixed;
    user-select: none;
  }

  .pro-preview-table td {
    box-sizing: border-box;
    padding: 0;
    border: 1px solid #000;
    text-align: center;
    vertical-align: middle;
  }

  .pro-preview-table thead {
    border: 3px solid #000;
    font-family: 'ヒラギノ明朝体3等幅', serif;
  }

  .pro-preview-table thead td {
    border-inline: 1px solid #000;
    font-weight: 400;
  }

  .pro-preview-stub {
    width: 8.5rem;
    min-width: 5.5rem;
    height: 2.6rem;
    border-inline: 3px solid #000 !important;
    font-size: 0.95rem;
    letter-spacing: 0;
    text-align: center;
  }

  .pro-preview-route-cell,
  .pro-preview-time-cell {
    width: 3rem;
    min-width: 3rem;
    max-width: 3rem;
  }

  .pro-preview-dnd-handle {
    width: 1.35rem;
    min-width: 1.35rem;
    max-width: 1.35rem;
    border-left: 3px solid #000 !important;
    background: #f7f8fb;
    color: #4f5b66;
    cursor: grab;
    line-height: 0;
  }

  .pro-preview-dnd-handle svg {
    display: block;
    width: 1rem;
    height: 1rem;
    margin: 0 auto;
  }

  .pro-preview-row-dragging > td {
    background: #e3f2fd !important;
    box-shadow: inset 0 0 0 2px #1976d2;
  }

  .pro-preview-row-combine-target > td {
    background: #d8ecff !important;
    box-shadow: inset 0 0 0 2px #0d47a1;
  }

  .pro-preview-drag-table {
    width: auto;
    opacity: 0.92;
  }

  .pro-preview-route-cell {
    height: 3rem;
    min-height: 3rem;
    overflow: hidden;
    white-space: pre-line;
  }

  .pro-preview-destination-cell {
    width: 3rem;
    min-width: 3rem;
    height: 7rem;
    min-height: 7rem;
    overflow: hidden;
  }

  .pro-preview-editable {
    position: relative;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  .pro-preview-editable:hover,
  .pro-preview-hovered {
    z-index: 1;
    background: #eef6ff !important;
    box-shadow:
      inset 0 0 0 2px #90caf9,
      0 0 0 2px #90caf9;
  }

  .pro-preview-route-name {
    display: flex;
    min-height: 3rem;
    align-items: center;
    justify-content: center;
    padding: 2px;
    overflow-wrap: anywhere;
    line-height: 1.1;
    white-space: pre-line;
  }

  .pro-preview-body-row {
    font-family: 'ヒラギノ明朝 ProN', serif;
    font-weight: 300;
  }

  .pro-preview-table tbody td {
    border-top: 0;
    border-bottom: 0;
  }

  .pro-preview-table tbody .pro-preview-merged-stop-row > td {
    border-top: 1px solid #000;
  }

  .pro-preview-table tbody td.pro-preview-section-line {
    border-top: 1px solid #000 !important;
  }

  .pro-preview-row-shaded {
    background: lightgray;
  }

  .pro-preview-table tbody .pro-preview-branch-start-row > td {
    border-top-width: 3px !important;
    border-top-style: double !important;
  }

  .pro-preview-table tbody .pro-preview-branch-end-row > td {
    border-bottom-width: 3px !important;
    border-bottom-style: double !important;
  }

  .pro-preview-pole-name {
    width: 8.5rem;
    min-width: 8.5rem;
    height: 1.65rem;
    padding-inline: 5px !important;
    border-left: 1px solid #000 !important;
    border-right: 0 !important;
    font-size: 0.92rem;
    font-weight: 300;
    line-height: 1.1;
  }

  .pro-preview-pole-name-text {
    display: block;
    width: 100%;
    min-width: 7.6rem;
    margin: 0 auto;
    white-space: nowrap;
  }

  .pro-preview-stop-name-bold .pro-preview-pole-name-text,
  .pro-preview-terminal-row .pro-preview-pole-name-text,
  .pro-preview-body-row:first-child .pro-preview-pole-name-text {
    font-family: 'ヒラギノ角ゴ ProN', sans-serif;
    font-weight: 600;
  }

  .pro-preview-platform {
    width: 1.5rem;
    min-width: 1.5rem;
    max-width: 1.5rem;
    border-inline: 0 !important;
    font-size: 0.86rem;
    line-height: 1;
  }

  .pro-preview-joko {
    width: 1.5rem;
    min-width: 1.5rem;
    max-width: 1.5rem;
    border-left: 0 !important;
    border-right: 3px solid #000 !important;
    font-size: 0.86rem;
    line-height: 1;
  }

  .pro-preview-destination-single,
  .pro-preview-destination-columns {
    display: flex;
    min-height: 7rem;
    align-items: stretch;
    justify-content: center;
    overflow: hidden;
    padding-block: 4px;
  }

  .pro-preview-destination-columns {
    flex-direction: row-reverse;
    gap: 4px;
  }

  .pro-preview-vertical-text {
    width: 1.5em;
    min-width: 1.5em;
    margin: 0 auto;
    line-height: 1.5rem;
    text-orientation: mixed;
    white-space: nowrap;
    writing-mode: vertical-rl;
  }

  .pro-preview-cell-lines {
    display: flex;
    min-height: 100%;
    flex-direction: row-reverse;
    align-items: stretch;
    justify-content: center;
    gap: 4px;
    padding-block: 2px;
    white-space: normal;
  }

  .pro-preview-cell-vertical {
    width: 1.5em;
    min-width: 1.5em;
    line-height: 1;
    text-orientation: mixed;
    white-space: pre-line;
    writing-mode: vertical-rl;
  }

  .pro-preview-text-justify {
    text-align: justify;
    text-align-last: justify;
    text-justify: inter-character;
  }

  .pro-preview-text-center {
    text-align: center;
    text-align-last: center;
  }

  .pro-preview-time-cell {
    height: 1.65rem;
    min-height: 1.65rem;
    padding: 1px !important;
    overflow: hidden;
    border-inline: 1px solid #000 !important;
    font-size: 0.9rem;
    line-height: 1.05;
  }
`
