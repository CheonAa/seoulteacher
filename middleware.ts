import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const role = req.nextauth.token?.role;
        const path = req.nextUrl.pathname;

        // 공지사항 조회 및 상세조회 페이지는 로그인하지 않은 일반 사용자(GUEST)도 접근 가능하게 우회
        const isPublicNotice = path === "/admin/notices" || 
            (/^\/admin\/notices\/[^\/]+$/.test(path) && path !== "/admin/notices/new");

        // Owner 영역
        if (path.startsWith("/owner") && role !== "OWNER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Admin 강사 관리 영역 (Owner 전용)
        if (path.startsWith("/admin/instructors") && role !== "OWNER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Admin 공통 영역 (Owner, Admin, Instructor 접근 가능 - 단, 공지사항 조회 페이지는 제외)
        if (!isPublicNotice && path.startsWith("/admin") && role !== "ADMIN" && role !== "OWNER" && role !== "INSTRUCTOR") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Instructor 영역 (Owner도 접근 가능)
        if (path.startsWith("/instructor") && role !== "INSTRUCTOR" && role !== "OWNER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;
                // 공지사항 목록 및 상세 조회(/admin/notices/new 제외)는 토큰(로그인) 없이도 허용
                const isPublicNotice = path === "/admin/notices" || 
                    (/^\/admin\/notices\/[^\/]+$/.test(path) && path !== "/admin/notices/new");
                
                if (isPublicNotice) {
                    return true;
                }
                return !!token;
            },
        },
        pages: {
            signIn: "/login",
        }
    }
);

export const config = {
    matcher: ["/admin/:path*", "/owner/:path*", "/instructor/:path*", "/dashboard/:path*"],
};
