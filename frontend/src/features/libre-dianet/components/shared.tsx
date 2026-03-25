import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import EditIcon from '@mui/icons-material/Edit'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material'
import { useRef, useState } from 'react'

export function EditableTitle({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false)

  return (
    <Box
      sx={{
        display: 'flex',
        flexGrow: 1,
      }}
    >
      {editing ? (
        <TextField
          autoFocus
          variant="standard"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setEditing(false)}
          sx={{ my: '0.67em' }}
          slotProps={{
            input: {
              sx: {
                fontSize: '2em',
                fontWeight: 'bold',
              },
            },
          }}
        />
      ) : (
        <>
          <Typography
            sx={{
              fontSize: '2em',
              fontWeight: 'bold',
              my: '0.67em',
            }}
          >
            {value}
          </Typography>
          <Box sx={{ display: 'flex' }}>
            <IconButton sx={{ my: 'auto' }} onClick={() => setEditing(true)}>
              <EditIcon />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  )
}

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
        削除
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>削除を確認</DialogTitle>
        <DialogContent>本当にこのプリセットを削除しますか？</DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
          >
            削除
          </Button>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export function UploadField({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
      }}
    >
      <TextField
        fullWidth
        size="small"
        value={file?.name ?? ''}
        sx={{
          flexGrow: 1,
          backgroundColor: 'white',
        }}
      />
      <Button
        size="small"
        variant="contained"
        startIcon={<CloudUploadIcon />}
        sx={{ whiteSpace: 'nowrap' }}
        onClick={() => inputRef.current?.click()}
      >
        参照
      </Button>
      <input ref={inputRef} hidden type="file" accept="application/zip" onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
    </Box>
  )
}

export function UpdateRawDataSection({ onSubmit }: { onSubmit: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 2 }}>
      <Box>
        <Typography variant="h6">GTFSデータをアップロードしてください</Typography>
        <Typography variant="body2" color="text.secondary">
          Zipデータは xlsx 出力時に再アップロードが必要です。
        </Typography>
      </Box>
      <UploadField file={file} onChange={setFile} />
      <Button fullWidth variant="contained" disabled={!file} onClick={() => file && onSubmit(file)}>
        プリセットデータの更新
      </Button>
    </Box>
  )
}
