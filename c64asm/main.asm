
        //
        // Compile using www.theweb.dk/KickAssembler
        //
        
        // Write out to a d64 disk after compiling.
        .disk [name="DISK", filename="frak.d64"] {
                [name="FRAK", type="prg", segments="Code"]
        }

        .label gfx = $2000
        .label gfx_hi = $20
        .label gfx_lo = $00
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
        ldx gfx_lo
        stx gfx_ref_lo
        ldx gfx_hi
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

        lda #100
        sta x
        sta y
        lda #1
        sta col
        jsr plot

        // wait forever
wait:   jmp wait

        
//
// set pixel in x,y to col
//
plot:  
        // byte = base + y & $f0 * 40 + x & ^$03 * 8 + y & 7
        // mask = (col & 3) >> (x & 3)
        // hi byte = $20 + hi((y & $f0) * 0b00101000)
        //         = $20 + (y & $f0) >> 5 + (y & $f0) >> 3
        //         => $fc
        lda y
        and #$f0
        lsr
        lsr
        lsr
        sta gfx_ref_hi
        
        // lo byte = lo((y & $f0) * 0b00101000) + (x & $fc) >> 1 + y & 7
        //         = (y & $10) << 3 + x & $fc >> 1 + y & 7
        //         => $fb
        lda #$00
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
        
