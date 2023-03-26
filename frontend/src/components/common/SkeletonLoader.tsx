import { Skeleton } from '@chakra-ui/react';
import * as React from 'react';

export interface ISkeletionLoaderProps {
    count : number;
    width: string;
    height: string;
}

const SkeletionLoader : React.FC<ISkeletionLoaderProps> = ({
    count,
    width,
    height
}) => {
  return (
   <>
   {[...Array(count)].map((_,i) => (
    <Skeleton 
    key={i}
    startColor='blackAlpha.400'
    endColor='whiteAlpha.300'
    height={height}
    width={ 'base' ? 'full': width}
    borderRadius={4}
    />
   ))}
   </>
  )
}

export default SkeletionLoader;