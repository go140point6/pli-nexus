// Check if the script is being run with sudo

async function checkSudo() {
    return new Promise((resolve, reject) => {
        if (process.getuid() !== 0) {
            console.error("Error: Please run this script with sudo.")
            process.exit(1); // Exit the current process
        } else {
            let sudoOk = "Success: You ran with sudo or are root."
            resolve(sudoOk)
        }
    })
}

module.exports = {
    checkSudo
}