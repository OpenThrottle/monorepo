/**
 * @description Non-theme Tailwind utilities safelisted for CMS content, as Tailwind v4
 * `@source inline()` brace patterns grouped by subject. A block's `className` is data in the
 * `cms` database, so Tailwind's source scan never sees it; these force the common utilities to
 * generate. Chosen in OT plan `8d73baa9` task 1 by gzip cost (≈ +2.4KB together): the full
 * spacing scale (+3.6KB) and opacity modifiers on theme colors (+1.5–4.3KB) were left out. The
 * theme-token colors are safelisted separately by `@openthrottle/react-router-shadcn`.
 */
export const CMS_SAFELIST_GROUPS: Readonly<Record<string, readonly string[]>> =
  {
    borders: ['border-{0,2,4,8}', 'border-{t,b,l,r,x,y}'],
    effects: [
      'opacity-{0,10,20,30,40,50,60,70,80,90,100}',
      'shadow-{xs,sm,md,lg,xl,2xl,none}',
    ],
    layout: [
      '{block,inline-block,inline,flex,inline-flex,grid,inline-grid,hidden,contents}',
      'flex-{row,row-reverse,col,col-reverse,wrap,nowrap,1,auto,initial,none}',
      '{grow,shrink-0}',
      'grid-cols-{1,2,3,4,5,6,7,8,9,10,11,12}',
      'col-span-{1,2,3,4,5,6,7,8,9,10,11,12,full}',
      'justify-{start,end,center,between,around,evenly}',
      'items-{start,end,center,baseline,stretch}',
      'self-{auto,start,end,center,stretch}',
      'content-{start,end,center,between}',
      'w-{full,auto,screen,fit,1/2,1/3,2/3,1/4,3/4}',
      'h-{full,auto,screen,fit}',
      'max-w-{xs,sm,md,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl,full,prose,none}',
      '{relative,absolute,sticky,overflow-hidden,overflow-auto}',
      '{md,lg}:{block,flex,grid,hidden}',
      '{md,lg}:flex-{row,col}',
      '{md,lg}:grid-cols-{1,2,3,4,5,6,12}',
      '{md,lg}:col-span-{1,2,3,4,5,6,12}',
    ],
    radius: [
      'rounded',
      'rounded-{none,xs,sm,md,lg,xl,2xl,3xl,4xl,full}',
      'rounded-{t,r,b,l}-{none,sm,md,lg,xl,2xl,full}',
    ],
    spacing: [
      '{p,px,py,pt,pr,pb,pl,m,mx,my,mt,mr,mb,ml,gap,gap-x,gap-y,space-x,space-y}-{0,1,2,3,4,6,8,10,12,16,20,24,32}',
      '{m,mx,my,mt,mr,mb,ml}-auto',
    ],
    typography: [
      'text-{xs,sm,base,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl,8xl,9xl}',
      'font-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black}',
      'font-{sans,serif,mono}',
      'leading-{none,tight,snug,normal,relaxed,loose,3,4,5,6,7,8,9,10}',
      'tracking-{tighter,tight,normal,wide,wider,widest}',
      'text-{left,center,right,justify,start,end}',
      '{uppercase,lowercase,capitalize,normal-case,italic,not-italic,underline,line-through,no-underline,truncate,text-balance,text-pretty,whitespace-nowrap,break-words}',
    ],
  };

/** @description Header stamped into the generated `src/cms-safelist.css`. */
export const CMS_SAFELIST_BANNER = `GENERATED — DO NOT EDIT. Regenerate with \`pnpm nx run @openthrottle/react-router-cms-core:test -- -u buildCmsSafelist\` (src/utils/buildCmsSafelist.ts).`; // prettier-ignore
