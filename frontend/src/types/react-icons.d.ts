declare module 'react-icons/fa' {
  import { IconType } from 'react-icons';
  
  export const FaMapMarkerAlt: IconType;
  export const FaCalendarAlt: IconType;
  export const FaClock: IconType;
  export const FaPhoneAlt: IconType;
  export const FaEnvelope: IconType;
  export const FaCalendarPlus: IconType;
  export const FaGraduationCap: IconType;
  export const FaArrowDown: IconType;
  export const FaArrowRight: IconType;
  export const FaArrowUp: IconType;
  export const FaTimes: IconType;
  export const FaMoneyBillWave: IconType;
  export const FaChild: IconType;
  export const FaHandHoldingHeart: IconType;
  export const FaGift: IconType;
  export const FaUsers: IconType;
  export const FaChartLine: IconType;
  export const FaUserCircle: IconType;
  export const FaChartBar: IconType;
  export const FaCheck: IconType;
  export const FaEdit: IconType;
  export const FaTrash: IconType;
  export const FaPlus: IconType;
  export const FaTrashAlt: IconType;
  export const FaUserPlus: IconType;
  export const FaSearch: IconType;
  export const FaUpload: IconType;
  export const FaBell: IconType;
  export const FaEye: IconType;
  export const FaInfoCircle: IconType;
  export const FaHeadset: IconType;
  export const FaShare: IconType;
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
