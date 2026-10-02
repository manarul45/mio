export async function applySavedInstructorName(course: any) {
  if (!course?.id) return course
  try {
    const directory = await $fetch<{ byCourseId: Record<string, string> }>('/api/course-instructors')
    const name = directory?.byCourseId?.[String(course.id)]
    if (name) course.instructor = { ...(course.instructor || {}), name }
  } catch {
    // Nama akun tetap dipakai bila daftar pengajar gagal dimuat.
  }
  return course
}
