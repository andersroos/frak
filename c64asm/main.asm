
        //
        // Compile using www.theweb.dk/KickAssembler
        //

        // Write out to a d64 disk after compiling.
        .disk [name="DISK", filename="frak.d64"] {
                [name="FRAK", type="prg", segments="Code"]
        }

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

        // gfx mem at $fb $2000
        lda #$00
        sta $fb  // lo byte
        lda #$20
        sta $fc  // hi byte


        
        // lda #$ff
        // sta $2000
        // lda #$00
        // sta $2001
        
        
        lda #$ff
        ldx #$00
        sta ($fb,x)
        lda #$00
        ldx #$01
        sta ($fb,x)
        
wait:   jmp wait
