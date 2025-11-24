import ReactSelect, { StylesConfig } from 'react-select'

const colourStyles: StylesConfig = {
  singleValue: (styles) => ({ ...styles, color: 'grey' }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#5f5f13' // Selected option color
      : state.isFocused
      ? 'rgba(95, 95, 19, 0.3)' // Hovered option color
      : '#white',
  }),
}

type Props = {
  options: { label: string; value: string }[]
  selectedOption?: { label: string; value: string }
  setSelectedOption?: React.Dispatch<
    React.SetStateAction<{ label: string; value: string }>
  >
}

export const Select = ({
  options,
  selectedOption,
  setSelectedOption,
}: Props) => (
  <ReactSelect
    className="basic-single"
    classNamePrefix="select"
    defaultValue={options[0]}
    value={selectedOption}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(option: any) =>
      setSelectedOption?.(option ? option : options[0])
    }
    isSearchable
    name="country"
    options={options}
    styles={colourStyles}
  />
)
