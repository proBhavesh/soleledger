const fs = require("fs");
const path = require("path");

// This script copies the Prisma engine binaries to the correct location for Vercel deployment
function copyPrismaEngines() {
  console.log("Copying Prisma engine binaries...");

  // Source location (where Prisma generates the binaries)
  const sourceDir = path.join(__dirname, "node_modules/.prisma/client");

  // Destination locations (where Next.js/Vercel will look for them)
  const destinations = [
    path.join(__dirname, ".prisma/client"),
    path.join(__dirname, ".next/server/.prisma/client"),
    path.join(__dirname, ".next/.prisma/client"),
  ];

  try {
    // Create destination directories if they don't exist
    destinations.forEach((destDir) => {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`Created directory: ${destDir}`);
      }
    });

    // Read all files in the source directory
    const files = fs.readdirSync(sourceDir);

    // Copy each engine file to all destination directories
    files.forEach((file) => {
      // Only copy engine binaries
      if (
        file.startsWith("libquery_engine-") ||
        file.startsWith("query_engine-")
      ) {
        const sourcePath = path.join(sourceDir, file);

        destinations.forEach((destDir) => {
          const destPath = path.join(destDir, file);
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copied ${file} to ${destDir}`);
        });
      }
    });

    console.log("Successfully copied Prisma engine binaries");
  } catch (error) {
    console.error("Error copying Prisma engine binaries:", error);
  }
}

copyPrismaEngines();
