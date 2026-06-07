export const tabLabels = ['路線', '標柱統合', 'プレビュー', 'デバッグ']

export const fieldLabelProps = {
  shrink: true,
  sx: {
    overflow: 'visible',
    maxWidth: 'none',
    px: 0.5,
  },
}

export const aboutLibreDiaNetText = `
LibreDiaNet は、交通系サークル「<a href="https://4-o.zone" target="_blank" rel="noopener noreferrer">大曽根層研</a>」が開発・提供している、GTFS データを活用した時刻表作成ツールです。

本ツールは AGPL ライセンスのもとで公開されており、ソースコードは以下の URL からご確認いただけます。 
<a href="https://github.com/Kai-Z-JP/LibreDiaNet" target="_blank" rel="noopener noreferrer">https://github.com/Kai-Z-JP/LibreDiaNet</a>

入力されたデータは、原則としてブラウザ上で完結するように処理されます。ただし、Excel ファイルへの出力時のみ、処理に必要な内容をサーバーへ送信します。
なお、入力・送信された情報およびアクセス情報の保存・解析は行っていません。

お問い合わせは、proj-dianet 'ｱｯﾄ' 4-o.zone までお願いいたします。
`
