package se.ygram.frak;

public class Block {
    public final String id;
    public final int x_start;
    public final int y_start;
    public final int y_size;
    public final int x_size;
    public final double y0_delta;
    public final double x0_delta;
    public final long y0_start_index;
    public final long x0_start_index;
    public final int max_n;

    Block(String id, int x_start, int y_start, int x_size, int y_size,
          long x0_start_index, double x0_delta, long y0_start_index, double y0_delta, int max_n)
    {
        this.id = id;
        this.x_start = x_start;
        this.y_start = y_start;
        this.y_size = y_size;
        this.x_size = x_size;
        this.y0_delta = y0_delta;
        this.x0_delta = x0_delta;
        this.y0_start_index = y0_start_index;
        this.x0_start_index = x0_start_index;
        this.max_n = max_n;
    }
}
