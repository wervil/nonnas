'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  title?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  isOpen,
  onClose,
  children,
  className,
  style,
  showCloseButton = true
}) => {
  const onChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent showCloseButton={showCloseButton} className={cn('z-[9999] !max-w-[80vw] !max-h-[80vh] h-full description-wrap--vertical bg-repeat-round p-0 m-0 gap-0', className)} style={style}>
        <DialogHeader className='p-0 m-0 gap-0'>
          {
            title &&
            <DialogTitle className='sr-only'>{title}</DialogTitle>
          }
          {
            description &&
            <DialogDescription>{description}</DialogDescription>
          }
        </DialogHeader>
        <div className='h-full overflow-y-auto'>{children}</div>
      </DialogContent>
    </Dialog>
  );
};
