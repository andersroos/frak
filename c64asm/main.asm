
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

start:  jsr $e544 // clear screen
        jsr $e566 // move home
        lda #$41
        jsr $e716 // write char to screen
wait:   jmp wait
