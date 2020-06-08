
        //
        // compile using www.theweb.dk/KickAssembler
        //
        // http://www.theweb.dk/KickAssembler/KickAssembler.pdf
        // https://sta.c64.org/cbm64mem.html
        // https://www.c64-wiki.com/wiki/Memory_(BASIC)
        // https://www.c64-wiki.com/wiki/Zeropage
        // https://www.masswerk.at/6502/6502_instruction_set.html#ASL
        // https://www.c64-wiki.com/wiki/Floating_point_arithmetic
        // https://vice-emu.sourceforge.io/vice_12.html
        // http://www.c64os.com/post/floatingpointmath
        //
        // most of this info is also in the books
        //
        
        // write out to a d64 disk after compiling
        .disk [name="DISK", filename="frak.d64"] {
                [name="FRAK", type="prg", segments="Code,Vars"]
        }

        //
        // macros
        //

        .macro load_fac(source) {
            ldy #>source
            lda #<source
            jsr mem_to_fac
        }

        .macro load_arg(source) {
            ldy #>source
            lda #<source
            jsr mem_to_arg
        }
        
        .macro store_fac(target) {
            ldy #>target
            ldx #<target
            jsr fac_to_mem
        }

        .macro add_fac_mem(mem) {
            ldy #>mem
            lda #<mem
            jsr fac_mem_add
        }

        .macro mul_fac_arg() {
            lda fac
            jsr mul_fac_arg
        }

        .macro sub_arg_fac_to_fac() {
            lda fac
            jsr sub_arg_fac
        }
        
        .macro parse_float_str_len7_to_mem(str, mem) {
            // parse str string to floating point in fac
            lda #>str
            sta str_to_fac_arg_hi
            lda #<str
            sta str_to_fac_arg_lo
            lda #7 // str len
            jsr str_to_fac
            
            // move fac to mem
            store_fac(mem)
        }       
        
        .macro move_float(target, source) {
            load_fac(source)  
            store_fac(target)
        }       

        .macro add_floats(target, source) {
            load_fac(target)
            add_fac_mem(source)
            store_fac(target)
        }

        .macro compare_fac_mem(mem) {
            ldy #>mem
            lda #<mem
            jsr cmp_fac_mem
        }

        //
        // locations
        //
        
        .label gfx_ref = $fb
        .label gfx_ref_lo = $fb
        .label gfx_ref_hi = $fc
        .label tmp = $02
        .label str_to_fac = $b7b5       // str in str_to_fac_arg_hi/lo
        .label str_to_fac_arg_lo = $22
        .label str_to_fac_arg_hi = $23
        .label fac_to_mem = $bbd4       // mem in y/x
        .label mem_to_fac = $bba2       // men in y/a
        .label mem_to_arg = $ba8c       // men in y/a
        .label fac_mem_add = $b867      // fac = fac + y/a
        .label mul_fac_arg = $ba2b      // fac = fac * arg (exp in a)
        .label sub_arg_fac = $b853      // fac = arg - fac (exp in a)
        .label cmp_fac_mem = $bc5b      // cmp fac, y/a
        .label fac = $61
        .label arg = $69
        
        //
        // variables
        //

        .var col_max = 32
        
        .segment Vars []
        *=$900 "Vars"
        
x:              .byte 0
y:              .byte 0
col:            .byte 0

xf:             .byte 5,0
yf:             .fill 5,0

float_2:        .fill 5,0
float_2_str:    .text "2.00000"

float_4:        .fill 5,0
float_4_str:    .text "4.00000"
        
start_xf_str:   .text "-2.0000"
start_xf:       .fill 5,0

delta_xf_str:   .text "0.01875"
delta_xf:       .fill 5,0
        
start_yf_str:   .text "-1.5000"
start_yf:       .fill 5,0
        
delta_yf_str:   .text "0.01500"
delta_yf:       .fill 5,0

xa:             .byte 5,0
ya:             .byte 5,0
xa2:            .byte 5,0
ya2:            .byte 5,0
xn:             .byte 5,0
yn:             .byte 5,0
        
        //
        // the code
        //
        
        .segment Code []
        BasicUpstart2(start) // creates a basic sys line that can starts the program
        
        *=$1000 "Code"
        
start:
        //
        // configure and clear screen
        //

        // clear screen
        jsr $e544 
        
        // multi color mode
        lda $d011 
        ora #$20
        sta $d011
        
        // multi color mode
        lda $d016 
        ora #$10
        sta $d016
        
        // gfx mem starts at $2000
        lda $d018
        ora #$08
        sta $d018
        
        // set background color
        lda #$00
        sta $d021
        
        // set foreground colors 1, 2 (excessive clear  $400 > 1000 needed make simpler code)
        lda #$72     // yellow, red
        ldx #00    
!loop:  sta $0400,x  // cols 1,2 offset $000
        sta $0500,x  // cols 1,2 offset $100
        sta $0600,x  // cols 1,2 offset $200
        sta $0700,x  // cols 1,2 offset $300
        dex
        bne !loop-
        lda #$05     // green
!loop:  sta $d800,x  // col 3,  offset $000
        sta $d900,x  // col 3,  offset $100
        sta $da00,x  // col 3,  offset $200
        sta $db00,x  // col 3,  offset $300
        dex
        bne !loop-

        // clear gfx mem $2000 - $3fff ($c0 too far)
        ldx #$00    // gfx lo
        stx gfx_ref_lo
        ldx #$20    // gfx hi
        stx gfx_ref_hi
        lda #$00   // value
!hi:    ldy #$00   // index
!lo:    sta (gfx_ref),y
        dey
        bne !lo-
        inc $fc
        ldx $fc
        cpx #$40
        bne !hi-

        //
        // prepare floating point data
        //
        
        parse_float_str_len7_to_mem(start_xf_str, start_xf)
        parse_float_str_len7_to_mem(delta_xf_str, delta_xf)
        parse_float_str_len7_to_mem(start_yf_str, start_yf)
        parse_float_str_len7_to_mem(delta_yf_str, delta_yf)
        parse_float_str_len7_to_mem(float_2_str, float_2)
        parse_float_str_len7_to_mem(float_4_str, float_4)
        
        //
        // loop over screen and fractal coordinates, hardcoded zoom (se above)
        //
        
        move_float(yf, start_yf)
        lda #0
        sta y
loopy:
        move_float(xf, start_xf)
        lda #0
        sta x
loopx:
        jsr calc
        jsr plot
        add_floats(xf, delta_xf)
        inc x
        lda x
        cmp #160
        bne loopx

        add_floats(yf, delta_yf)
        inc y
        cmp #200
        bne loopy

        // wait forever
        jmp *


//
// calculate col from xf, yf
//
calc:
        lda #0
        sta col
        move_float(xa, xf)
        move_float(ya, yf)
!loop:
        // xa2 = xa * xa
        load_fac(xa)
        load_arg(xa)
        mul_fac_arg()
        store_fac(xa2)

        // ya2 = ya * ya
        load_fac(ya)
        load_arg(ya)
        mul_fac_arg()
        store_fac(ya2)

        // xa2 + ya2 >= 4.0
        add_fac_mem(xa2)
        compare_fac_mem(float_4)
        bpl !break+

        // col >= col_max
        lda col
        cmp #col_max
        bpl !break+

        // xn = xa2 - ya2 + xf
        load_fac(ya2)
        load_arg(xa2)
        sub_arg_fac_to_fac()
        add_fac_mem(xf)
        store_fac(xn)

        // ya = 2 * xa * ya + yf
        load_fac(xa)
        load_arg(ya)
        mul_fac_arg()
        load_arg(float_2)
        mul_fac_arg()
        add_fac_mem(yf)
        store_fac(ya)

        // xa = xn
        move_float(xa, xn)
        
        // col += 1
        inc col

        jmp !loop-
!break:  
        // if col >= col_max then col = 0
        lda col
        cmp #col_max
        bmi !less+
        lda #0
!less:
        and #3
        sta col
        rts
        
        
//
// set pixel in x,y to col
//
plot:
        // byte = base + y & $f8 * 40 + x & 0xfc * 2 + y & 7
        // mask = (col & 3) >> (3 - (x & 3)) * 2

        // hi byte = $20 + hi((y & $f8) * 0b00101000) + x & 0x80 >> 7
        //         = $20 + (y & $f8) >> (8 - 5) + (y & $f8) >> (8 - 3) + x & 0x80 >> 7
        //         => $fc
        lda y              // start with y & $f8
        and #$f8
        lsr                // first shift 3
        lsr
        lsr
        sta gfx_ref_hi     // save
        lsr                // shift another 2
        lsr
        clc
        adc gfx_ref_hi
        sta gfx_ref_hi     // add and save
        lda #$20           // add $20
        adc gfx_ref_hi
        sta gfx_ref_hi
        lda x              // x & $80
        and #$80
        rol                // x >> 7 => rol
        adc gfx_ref_hi     // add and save
        sta gfx_ref_hi
        
        // lo byte = lo((y & $f8) * 0b00101000) + (x & $7c) << 1 + y & 7
        //         = (y & $f8) << 3 + (y & $f8) << 5 + (x & $7c) << 1 + y & 7
        //         => $fb
        lda y             // y & $f8 
        and #$f8
        asl               // shift 3
        asl
        asl
        sta gfx_ref_lo    // save
        asl               // shift another 2
        asl
        clc
        adc gfx_ref_lo    // add and save (overflow is handled by hi multiplication)
        sta gfx_ref_lo
        lda x             // x & $7c
        and #$fc
        asl               // << 1
        clc
        adc gfx_ref_lo    // add
        bcc !cc+          // check overflow
        inc gfx_ref_hi    // add overflow to hi
!cc:    sta gfx_ref_lo    // save
        lda y             // y & $07
        and #$7
        clc
        adc gfx_ref_lo    // add and save (does not overflow in practice)
!cc:    sta gfx_ref_lo

        // mask = (col & 3) << (3 - x & 3) * 2
        lda x
        and #3
        tax     // a -> x
        lda col
        and #3
!loop:  cpx #3
        beq !break+
        asl
        asl
        inx
        jmp !loop-
!break:
        ldy #$00
        ora (gfx_ref),y
        sta (gfx_ref),y
        rts
        
//
// set gfx top left corder
//
debug_set_top_left:
        lda #$00
        sta $2000
        lda #$55
        sta $2001
        lda #$aa
        sta $2002
        lda #$ff
        sta $2003
        rts

//
// set gfx lower right corder
//
debug_set_bot_right:
        lda #$00
        sta $3f3c
        lda #$55
        sta $3f3d
        lda #$aa
        sta $3f3e
        lda #$ff
        sta $3f3f
        rts
        
