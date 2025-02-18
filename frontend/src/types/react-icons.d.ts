declare module 'react-icons/fa' {
  import { IconType } from 'react-icons';
  
  export const FaMapMarkerAlt: IconType;
  export const FaCalendarAlt: IconType;
  export const FaClock: IconType;
  export const FaPhoneAlt: IconType;
  export const FaEnvelope: IconType;
}

declare module 'react-icons/fi' {
  import { IconType } from 'react-icons';
  
  export const FiEdit: IconType;
  export const FiUpload: IconType;
  export const FiMapPin: IconType;
  export const FiMessageSquare: IconType;
  export const FiCheck: IconType;
  export const FiX: IconType;
  export const FiMap: IconType;
  export const FiTrash2: IconType;
}

declare module 'react-icons' {
  import { ComponentType, SVGAttributes } from 'react';
  
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }

  export type IconType = ComponentType<IconBaseProps>;
}
