"use client";

import ReactSelect, { StylesConfig } from 'react-select'
import { usePathname } from 'next/navigation'

const exploreStyles: StylesConfig = {
  control: (styles) => ({ ...styles, minHeight: '42px', height: '42px', backgroundColor: 'white' }),
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

const defaultStyles: StylesConfig = {
  singleValue: (styles) => ({ ...styles, color: 'grey' }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#5f5f13'
      : state.isFocused
        ? 'rgba(95, 95, 19, 0.3)'
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
}: Props) => {
  const pathname = usePathname()

  return (
    <ReactSelect
      className="basic-single"
      classNamePrefix="select"
      isClearable={pathname === '/explore'}
      value={selectedOption}
      placeholder={placeholder}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(option: any) =>
        setSelectedOption?.(option)
      }
      isSearchable
      name="country"
      options={options}
      styles={defaultStyles}
      components={{
        Option: (props) => <CustomOption {...props} onOptionHover={onOptionHover} />
      }}
    />
  )
}

export const ExploreSelect = ({
  options,
  selectedOption,
  setSelectedOption,
  onOptionHover,
  placeholder,
}: Props) => {
  const pathname = usePathname()

  return (
    <ReactSelect
      // Remove basic-single if causing issues, or keep it depending on desired behavior
      classNamePrefix="select"
      className='bg-white rounded-md'
      isClearable={pathname === '/explore'}
      value={selectedOption}
      placeholder={placeholder}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(option: any) =>
        setSelectedOption?.(option)
      }
      isSearchable
      name="country"
      options={options}
      styles={exploreStyles}
      components={{
        Option: (props) => <CustomOption {...props} onOptionHover={onOptionHover} />
      }}
    />
  )
}
