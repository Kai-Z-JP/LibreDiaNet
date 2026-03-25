import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useState } from 'react'
import { UploadField } from './shared'

type Props = {
  onCreate: (file: File) => Promise<void>
}

export function CreateRawPresetDialog({ onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <>
      <Button fullWidth variant="contained" onClick={() => setOpen(true)}>
        Zipファイルから新しいプリセットを作成
      </Button>
      <Dialog open={open} maxWidth="sm" fullWidth onClose={() => setOpen(false)}>
        <DialogTitle>GTFSデータをアップロードしてください</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Zipファイルからの読み込みはベータ版です。
          </Typography>
          <UploadField file={file} onChange={setFile} />
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            variant="contained"
            disabled={!file || submitting}
            onClick={async () => {
              if (!file) {
                return
              }
              setSubmitting(true)
              try {
                await onCreate(file)
                setFile(null)
                setOpen(false)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            新しいプリセットを作成
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
