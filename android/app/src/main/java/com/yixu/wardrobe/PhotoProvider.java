package com.yixu.wardrobe;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** A narrow, non-exported camera output provider; never exposes arbitrary app files. */
public class PhotoProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    private File image(Uri uri) throws FileNotFoundException {
        if (!"/capture.jpg".equals(uri.getPath())) throw new FileNotFoundException("Unknown photo");
        return new File(getContext().getCacheDir(), "capture.jpg");
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(image(uri), ParcelFileDescriptor.parseMode(mode));
    }
    @Override public String getType(Uri uri) { return "image/jpeg"; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        try {
            File file = image(uri);
            MatrixCursor cursor = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
            cursor.addRow(new Object[]{file.getName(), file.length()});
            return cursor;
        } catch (FileNotFoundException e) { return null; }
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String where, String[] args) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String where, String[] args) { return 0; }
}
