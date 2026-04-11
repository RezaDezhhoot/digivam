import Swal from 'sweetalert2';

export const useConfirm = () => {
  const confirm = (options = {}) =>
    Swal.fire({
      title: options.title || 'آیا مطمئن هستید؟',
      text: options.text || '',
      icon: options.icon || 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'بله، انجام بده',
      cancelButtonText: options.cancelText || 'انصراف',
      confirmButtonColor: '#0b5f83',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      customClass: {
        popup: 'swal-rtl'
      }
    }).then((result) => result.isConfirmed);

  return { confirm };
};
