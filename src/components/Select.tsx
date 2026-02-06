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
  setSelectedOption?:
  | React.Dispatch<React.SetStateAction<{ label: string; value: string }>>
  | ((option: { label: string; value: string }) => void)
  onOptionHover?: (option: { label: string; value: string } | null) => void
  placeholder?: string
}

const CustomOption = (props: any) => {
  const { innerProps, data, onOptionHover } = props
  return (
    <div
      {...innerProps}
      onMouseEnter={() => onOptionHover?.(data)}
      onMouseLeave={() => onOptionHover?.(null)}
      className={`px-3 py-2 cursor-pointer hover:bg-[rgba(95,95,19,0.3)] ${props.isSelected ? 'bg-[#5f5f13] text-white' : 'text-gray-700'}`}
    >
      {props.label}
    </div>
  )
}

export const Select = ({
  options,
  selectedOption,
  setSelectedOption,
  onOptionHover,
  placeholder,
}: Props) => (
  <ReactSelect
    className="basic-single"
    classNamePrefix="select"
    isClearable={true}
    value={selectedOption}
    placeholder={placeholder}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(option: any) =>
      setSelectedOption?.(option)
    }
    isSearchable
    name="country"
    options={options}
    styles={colourStyles}
    components={{
      Option: (props) => <CustomOption {...props} onOptionHover={onOptionHover} />
    }}
  />
)
