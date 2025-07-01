import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`Uploading ${files.length} files...`);

    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not set - using mock URLs for development');
      
      // Return mock URLs for development
      const mockUrls = files.map((file, index) => 
        `https://example.com/mock-image-${index}-${file.name}`
      );
      
      return NextResponse.json({
        message: 'Files uploaded successfully (mock mode)',
        urls: mockUrls,
      });
    }

    const uploadPromises = files.map(async (file) => {
      try {
        console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
        const blob = await put(file.name, file, {
          access: 'public',
        });
        console.log(`Successfully uploaded: ${blob.url}`);
        return blob.url;
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        throw error;
      }
    });

    const urls = await Promise.all(uploadPromises);

    return NextResponse.json({
      message: 'Files uploaded successfully',
      urls,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { message: `Upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
} 