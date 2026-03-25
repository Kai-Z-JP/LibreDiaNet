import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import type { RouteDetail, RouteOption } from '../../../types'

type Props = {
  routeOptions: RouteOption[]
  value: RouteDetail[]
  onChange: (routes: RouteDetail[]) => void
}

export function RouteSelectionPanel({ routeOptions, value, onChange }: Props) {
  const selectedOptions = value
    .map((route) => routeOptions.find((option) => option.id === route.id && option.direction === route.direction))
    .filter((option): option is RouteOption => Boolean(option))

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={routeOptions}
      value={selectedOptions}
      isOptionEqualToValue={(option, current) => option.railwayCode === current.railwayCode}
      getOptionLabel={(option) => option.label}
      onChange={(_, nextValue) => onChange(nextValue.map((option) => ({ id: option.id, direction: option.direction })))}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.railwayCode}>
          <Box>
            <Typography variant="body2" sx={{ color: 'grey', fontSize: '0.75em' }}>
              {`ID: ${option.id} Dir: ${option.direction ?? '(none)'}`}
            </Typography>
            <Typography>{option.name}</Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label="路線" margin="normal" sx={{ backgroundColor: 'white' }} />}
    />
  )
}
