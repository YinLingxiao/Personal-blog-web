import React from 'react';

interface AsciiMoonProps {
  variant?: 'full' | 'small';
  className?: string;
  style?: React.CSSProperties;
}

const FULL_MOON = `                        -------            
                 ---------------         
              --------~-------~~~--      
            ------~~---~~---------~~-    
           ------~--~~-~--~~-~-~~---~   
          --~~-~-~~-~--~~--~~~~---~--   
         ---~--~--~~--~~--~--~--~-~--   
         ~-~-~-~~--~-~--~-~-~-~---~---  
         ---~-~--~--~-~-~~--~--~--~-~-  
          -~-~-~-~--~--~-~-~---~-~--~   
           ~-~-~~-~--~~-~~--~~---~--    
            ---~-~--~--~~--~-~-~--      
              -~--~-~-~-~~-~~---        
                 -~-~-~-~---            
                        ~-              `;

const SMALL_MOON = `       -------       
    ---~----~~~--   
   --~~-~--~~---~   
  -~-~-~~--~~--~~-  
  --~-~-~--~-~-~--  
   -~-~~-~~--~~--   
    --~-~-~~-~--    
       -~-~-~--     `;

const AsciiMoon: React.FC<AsciiMoonProps> = ({ variant = 'full', className = '', style }) => {
  const text = variant === 'full' ? FULL_MOON : SMALL_MOON;

  return (
    <pre
      className={className}
      style={{
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.2,
        letterSpacing: '0.05em',
        whiteSpace: 'pre',
        userSelect: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      {text}
    </pre>
  );
};

export default React.memo(AsciiMoon);
