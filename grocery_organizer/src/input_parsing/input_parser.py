class InputParser:
    def __init__(self, file):
        self.file=file

    # TODO branch based on file type
    # Image files should use handwritting recognition
    def text_parser(self):
        items = []
        with open(self.file, "r") as file:
            for line in file:
                items.append(line.strip().lower())

        return items