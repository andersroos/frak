
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

        .macro add_float(target, source) {
            load_fac(target)
            add_fac_mem(source)
            store_fac(target)
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
        .label fac_mem_add = $b867      // fac = fac + y/a
        .label fac = $61
        .label arg = $69
        
        //
        // variables
        //

        .segment Vars []
        *=$900 "Vars"
        
x:              .byte 0
y:              .byte 0
col:            .byte 0

fx:             .byte 5,0
fy:             .fill 5,0

start_fx_str:   .text "-2.0000"
start_fx:       .fill 5,0

delta_fx_str:   .text "0.01875"
delta_fx:       .fill 5,0
        
start_fy_str:   .text "-1.5000"
start_fy:       .fill 5,0
        
delta_fy_str:   .text "0.01500"
delta_fy:       .fill 5,0
        
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
        
        parse_float_str_len7_to_mem(start_fx_str, start_fx)
        parse_float_str_len7_to_mem(delta_fx_str, delta_fx)
        parse_float_str_len7_to_mem(start_fy_str, start_fy)
        parse_float_str_len7_to_mem(delta_fy_str, delta_fy)
        
        //
        // loop over screen and fractal coordinates, hardcoded zoom (se above)
        //
        
        move_float(fy, start_fy)
        lda #0
        sta y
loopy:
        move_float(fx, start_fx)
        lda #0
        sta x
loopx:
        jsr calc
        jsr plot
        add_float(fx, delta_fx)
        inc x
        lda x
        cmp #160
        bne loopx

        add_float(fy, delta_fy)
        inc y
        cmp #200
        bne loopy

        // wait forever
wait:   jmp wait


//
// calculate col from fx, fy
//
calc:
        col = 0
        x = fx
        y = fy
        while (x^2 + y^2 < 4 && col < 32) {
           xn = x^2 - y^2 + fx
           yn = 2 * x * y + fy
           col += 1
        }
        if col >= 32 then col = 0
        col &= 3
        
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
        
