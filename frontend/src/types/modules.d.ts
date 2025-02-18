declare module 'xlsx' {
  const XLSX: any;
  export = XLSX;
}

declare module 'react-chartjs-2' {
  export const Line: React.FC<any>;
  export const Bar: React.FC<any>;
  export const Pie: React.FC<any>;
  export const Doughnut: React.FC<any>;
}

declare module 'react-toastify' {
  export const toast: any;
  export const ToastContainer: React.FC<any>;
}
