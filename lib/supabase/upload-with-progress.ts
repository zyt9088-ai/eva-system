"use client";

import { supabase } from "@/lib/supabase/client";

// supabase-js uploads through fetch, which exposes no progress events — a 30 MB
// PDF would upload with the UI frozen on a spinner. This sends byte-for-byte
// the same request StorageFileApi.upload() sends for a Blob body (a multipart
// POST to /storage/v1/object/{bucket}/{path}, cacheControl part included), but
// over XMLHttpRequest, whose upload.onprogress gives us the bytes-sent stream.
export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى قبل رفع المرفقات");
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const form = new FormData();
  form.append("cacheControl", "3600");
  // The bucket only allows application/pdf, and storage reads the mime type off
  // the multipart part — so pin it here rather than trusting the OS-reported
  // type, which comes back empty for some files.
  form.append("", new File([file], file.name, { type: "application/pdf" }));

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    if (anonKey) xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      // Hold at 99% until the server actually answers, so the bar never sits
      // "complete" while the request is still in flight.
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = `فشل رفع الملف (${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (body?.message || body?.error) message = body.message || body.error;
      } catch {
        // Non-JSON error body — keep the status-code message.
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("تعذّر الاتصال بالخادم أثناء رفع الملف"));
    xhr.onabort = () => reject(new Error("تم إلغاء رفع الملف"));

    xhr.send(form);
  });
}
