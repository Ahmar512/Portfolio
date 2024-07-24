import React from 'react'

const Button = ({label}) => {
  return (
    <div>
        <button className='bg-blue-500 px-5 py-2 rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors font-montserrat'>
            {label}
        </button>
    </div>
  )
}

export default Button