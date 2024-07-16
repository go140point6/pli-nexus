#!/bin/bash

# *** SETUP SOME VARIABLES THAT THIS SCRIPT NEEDS ***

# Set Colour Vars
GREEN='\033[0;32m'
#RED='\033[0;31m'
RED='\033[0;91m'  # Intense Red
YELLOW='\033[0;33m'
BYELLOW='\033[1;33m'
BLUE='\033[0;94m'
NC='\033[0m' # No Color

# Find out who is running this script
if [ "$(id -u)" -ne 0 ]; then
    # Regular user without invoking sudo
    ORIG_USER=$(getent passwd "$(id -u)" | cut -d: -f1)
    ORIG_HOME=$(getent passwd "$(id -u)" | cut -d: -f6)
else
    if [ -n "$SUDO_USER" ]; then
        # Regular user with sudo
        ORIG_USER=$(getent passwd "$SUDO_USER" | cut -d: -f1)
        ORIG_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    else
        # Root user without sudo
        ORIG_USER=$(getent passwd "$(id -u)" | cut -d: -f1)
        ORIG_HOME=$(getent passwd "$(id -u)" | cut -d: -f6)
    fi
fi

echo -e "$ORIG_USER"
echo -e "$ORIG_HOME"

# Authenticate sudo perms before script execution to avoid timeouts or errors.
# Extend sudo timeout to 20 minutes, instead of default 5 minutes.
if sudo -l > /dev/null 2>&1; then
    TMP_FILE01=$(mktemp)
    TMP_FILENAME01=$(basename $TMP_FILE01)
    echo "Defaults:$USER_ID timestamp_timeout=20" > $TMP_FILE01
    sudo sh -c "cat $TMP_FILE01 > /etc/sudoers.d/$TMP_FILENAME01"
else
    echo "The user $USER_ID doesn't appear to have sudo privledges, add to sudoers or run as root."
    FUNC_EXIT_ERROR
fi

# Get the absolute path of the directories
MONITOR_DIR=$HOME/pli-nexus
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
VARS_FILE=pli-nexus.vars
source $SCRIPT_DIR/$VARS_FILE


FUNC_VERIFY() {
    CHECK_PASSWD=false
    while true; do
        read -t10 -r -p "Are you sure you want to continue? (Y/n) " _input
        if [ $? -gt 128 ]; then
            echo
            echo "Timed out waiting for user response - quitting..."
            exit 0
        fi
        case $_input in
            [Yy][Ee][Ss]|[Yy]* )
                break
                ;;
            [Nn][Oo]|[Nn]* ) 
                exit 0
                ;;
            * ) echo "Please answer (y)es or (n)o.";;
        esac
    done
}


FUNC_PKG_CHECK(){
    echo
    echo -e "${GREEN}#########################################################################${NC}"
    echo
    echo -e "${GREEN}## ${YELLOW}Check/install necessary packages... ${NC}"
    echo     

    sudo apt-get update
    for i in "${SYS_PACKAGES[@]}"
    do
        hash $i &> /dev/null
        if [ $? -eq 1 ]; then
            echo >&2 "package "$i" not found. installing..."
            sudo apt install -y "$i"
        else
            echo "packages "$i" exist, proceeding to next..."
        fi
    done
    echo -e "${GREEN}## ALL PACKAGES INSTALLED.${NC}"
    echo 
    echo -e "${GREEN}#########################################################################${NC}"
    echo
    sleep 2s
}


FUNC_CHECK_REQUIRED(){
    echo -e
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e
    echo -e "${GREEN}## ${YELLOW}Setup: Checking host record...${NC}"
    echo -e

    if [ -z "$HOST_RECORD" || $HOST_RECORD === 'nexus.EXAMPLE.com']; then
        echo -e "HOST_RECORD either missing or left default. You must create a DNS host record for your server, aborting..."
        FUNC_EXIT_ERROR
    fi

    IP_DNS=$(dig +short A "$HOST_RECORD")

    if [ -z "$IP_DNS" ]; then
        echo -e `${HOST_RECORD} doesn't appear to be a valie host record or hasn't replicated yet. Aborting...`
        FUNC_EXIT_ERROR
    else
        echo -e `Found ${HOST_RECORD} at ${IP_DNS}`
    fi
}


FUNC_APACHE_SETUP(){
    echo -e
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e
    echo -e "${GREEN}## ${YELLOW}Setup: Apache and mods setup${NC}"
    echo -e
    
    echo -e "${GREEN}## ${YELLOW}Step 1. Install Apache... ${NC}"
    echo -e

    sudo apt-get update
    sudo apt-get install apache2

    echo -e "${GREEN}## ${YELLOW}Step 2. Install Apache mods... ${NC}"
    echo -e

    for i in "${APACHE_MODS[@]}"
    do
        sudo a2enmod "$i"
    done

    echo -e "${GREEN}## ${YELLOW}Step 3. Restart Apache... ${NC}"
    echo -e

    sudo systemctl restart apache2.service
}
    

FUNC_CERTBOT(){
    echo -e
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e
    echo -e "${GREEN}## ${YELLOW}Setup: Certbot and get SSL cert${NC}"
    echo -e
    
    echo -e "${GREEN}## ${YELLOW}Step 1. Install Certbot... ${NC}"
    echo -e






}

FUNC_NOPASSWD_SUDO(){
    echo -e
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e
    echo -e "${GREEN}## ${YELLOW}Setup: Give current user the ability to sudo /usr/bin/systemctl${NC}"
    echo -e "${GREEN}## ${YELLOW}without needing to provide the sudo password${NC}"
    echo -e

    SUDOERS_LINE="$ORIG_USER ALL=(ALL:ALL) NOPASSWD:/usr/bin/systemctl"
    TMP_FILE06=$(mktemp)
    sudo cp /etc/sudoers $TMP_FILE06

    # Check if the line already exists to prevent duplicate entries
    if ! sudo grep -Fxq "$SUDOERS_LINE" $TMP_FILE06; then
    # Add the new line to the end of the temporary sudoers file
        sudo sed -i "\$a $SUDOERS_LINE" $TMP_FILE06
    
        if sudo visudo -c -f $TMP_FILE06; then
            sudo cp $TMP_FILE06 /etc/sudoers
            echo -e "$ORIG_USER added to sudoers."
        else
            echo -e "Error: visudo check failed. Changes not applied."
        fi
    else
        echo -e "The line already exists in the sudoers file."
    fi
}


FUNC_APACHE_LB(){
    
    echo -e "${GREEN}###############################################################################${NC}"
    echo -e "${YELLOW}###############################################################################${NC}"
    echo -e "${GREEN}${NC}"
    echo -e "${GREEN}           ** ${NC}Apache Load Balancer Setup${GREEN} **${NC}"
    echo -e "${GREEN}${NC}"
    echo -e "${YELLOW}###############################################################################${NC}"
    echo -e "${GREEN}###############################################################################${NC}"
    echo -e
    sleep 2s

    FUNC_VERIFY
    #FUNC_PKG_CHECK
    FUNC_CHECK_REQUIRED
    #FUNC_INSTALL_SERVICE
    #FUNC_FIREWALL_CONFIG
    #FUNC_CREATE_ENV
    #FUNC_SETUP_PM2
    #FUNC_LOGROTATE
    FUNC_NOPASSWD_SUDO
    FUNC_EXIT
}


# setup a clean exit
trap SIGINT_EXIT SIGINT
SIGINT_EXIT(){
    stty sane
    echo
    echo "Exiting before completing the script."
    exit 1
    }


FUNC_EXIT(){
    # remove the sudo timeout for USER_ID.
    echo -e
    echo -e "${GREEN}Performing clean-up:${NC}"
    sudo sh -c "rm -fv /etc/sudoers.d/$TMP_FILENAME01"
    bash ~/.profile
    sudo -u $USER_ID sh -c 'bash ~/.profile'
    echo -e
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e
    echo -e "${GREEN}       **${NC} Apache Load Balancer installed ${GREEN}**${NC}"
    echo -e
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e "${GREEN}#########################################################################${NC}"
    echo -e
	exit 0
	}


FUNC_EXIT_ERROR(){
	exit 1
	}


FUNC_APACHE_LB