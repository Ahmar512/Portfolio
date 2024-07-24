import React from 'react'
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Social = ({Icon}) => {
  return (
    <div className='bg-blue-500 h-[50px] w-[50px] rounded-full flex justify-center items-center hover:bg-blue-600 cursor-pointer hover:scale-[1.2] transition-transform'>
        <Icon />
    </div>
  )
}

export default Social