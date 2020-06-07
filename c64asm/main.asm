
        //
        // Compile using www.theweb.dk/KickAssembler
        //
        
        // Write out to a d64 disk after compiling.
        .disk [name="DISK", filename="frak.d64"] {
                [name="FRAK", type="prg", segments="Code"]
        }

        .label gfx_ref = $fb
        .label gfx_ref_lo = $fb
        .label gfx_ref_hi = $fc
        
        //
        // The Code
        //
        
        .segment Code []
        BasicUpstart2(start) // Creates a basic sys line that can starts the program.
        
        *=$1000 "Code"
        
start:  // clear screen
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

        jsr debug_set_top_left
        jsr debug_set_bot_right


        // debug print
        lda #$41   // gul svart svart gul
        sta $3ae2  // 80 - 83 x 170
        sta $3c24  // 80 - 83 x 180
        sta $3d66  // 80 - 83 x 190

        lda #2     // röd
        sta col

        lda #72
        sta x

        lda #170
        sta y
        jsr plot  // 0x3ad3

        lda #180
        sta y
        jsr plot  // 0x3c14

        lda #190
        sta y
        jsr plot  // 0x3d56
        
        // wait forever
wait:   jmp wait

        
//
// set pixel in x,y to col
//
plot:
        // byte = base + y & $f8 * 40 + x & 0xfc * 2 + y & 7
        // mask = (col & 3) >> (x & 3)

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
        
        // lo byte = lo((y & $f8) * 0b00101000) + (x & $fc) << 1 + y & 7
        //         = (y & $f8) << 3 + (y & $f8) << 5 + (x & $fc) << 1 + y & 7
        //         => $fb
        lda y             // y & $f8 
        and #$f8
        asl               // shift 3
        asl
        asl
        sta gfx_ref_lo    // save
        asl               // shift another 2
        asl
        adc gfx_ref_lo    // add save
        sta gfx_ref_lo    
        lda x             // x & $fc
        and #$fc
        asl               // << 1
        adc gfx_ref_lo    // add and save
        sta gfx_ref_lo    
        lda y             // y & $07
        and #$07
        adc gfx_ref_lo    // add and save
        sta gfx_ref_lo
        
        // mask = (col & 3) >> (x & 3)
        lda #$ff
        ldy #$00
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
        
x:      nop
y:      nop
col:    nop  
        
