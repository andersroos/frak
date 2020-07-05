package se.ygram.frak;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Formatter;
import java.util.logging.LogRecord;

public class LogFormatter extends Formatter {

    private final static DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private final static ZoneId UTC = ZoneId.of("UTC");

    public String format(LogRecord record) {
        String timestamp = dateFormatter.format(ZonedDateTime.ofInstant(record.getInstant(), UTC));

        String logLevel = record.getLevel().toString();

        String thread = String.format("%d ", record.getThreadID());
        int remaning = 51 - thread.length();
        String location = record.getSourceClassName();
        location = location.substring(Math.max(0, location.length() - remaning));
        location = " ".repeat(remaning - location.length()) + location;

        String message = this.formatMessage(record);

        return String.format("%s %-7s [%s%s] %s\n", timestamp, logLevel, thread, location, message);
    }
}
